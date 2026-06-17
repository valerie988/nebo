import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { chatService, Message } from "./chatService";

const RAW_URL = Constants.expoConfig?.extra?.API_URL || "http://localhost:8000";
const WS_BASE = RAW_URL.replace(/^http/, "ws");

type MsgListener    = (msg: Message) => void;
type StatusListener = (online: boolean) => void;

class ChatSocket {
  private ws:          WebSocket | null = null;
  private token:       string           = "";
  private userId:      string           = "";
  private retryCount:  number           = 0;
  private retryTimer:  ReturnType<typeof setTimeout> | null = null;
  private destroyed:   boolean          = false;

  private msgListeners:    Set<MsgListener>    = new Set();
  private statusListeners: Set<StatusListener> = new Set();

  connect(token: string, userId: string): void {
    this.token     = token;
    // FIX: always normalize to a clean trimmed string — prevents int/string
    // mismatch that caused isMyEcho to fail and own messages to echo back
    this.userId    = String(userId).trim();
    this.destroyed = false;
    this._open();
  }

  disconnect(): void {
    this.destroyed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.ws?.close();
    this.ws = null;
    this._notifyStatus(false);
  }

  send(params: {
    localId:        string;
    receiverId:     string;
    text:           string;
    conversationId: string;
  }): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify({
      type:            "message",
      local_id:        params.localId,
      receiver_id:     params.receiverId,
      text:            params.text,
      conversation_id: params.conversationId,
    }));
    return true;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  onMessage(fn: MsgListener): () => void {
    this.msgListeners.add(fn);
    return () => this.msgListeners.delete(fn);
  }

  onStatus(fn: StatusListener): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  private _open(): void {
    if (this.destroyed) return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
       this.ws.readyState === WebSocket.CONNECTING)
    ) return;

    try {
      this.ws = new WebSocket(`${WS_BASE}/api/chat/ws/${this.token}`);

      this.ws.onopen = async () => {
        console.log("✅ WS connected, userId:", this.userId);
        this.retryCount = 0;
        this._notifyStatus(true);
        await this._flushPending();
      };

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          // FIX: normalize both sides to trimmed strings before comparing
          // to prevent "123" !== 123 type mismatches
          const dataSenderId = String(data.sender_id ?? "").trim();
          const myUserId     = String(this.userId).trim();

          console.log("📨 RAW WS:", JSON.stringify({
            type:        data.type,
            sender_id:   dataSenderId,
            receiver_id: data.receiver_id,
            local_id:    data.local_id,
            my_userId:   myUserId,
            isMyEcho:    dataSenderId === myUserId,
          }));

          // ── Delivery confirmation ────────────────────────────────────────
          if (data.type === "delivered" && data.local_id) {
            await chatService.confirmMessage(
              myUserId, data.local_id, data.message_id, data.conversation_id,
            );
            return;
          }

          // ── Incoming message ─────────────────────────────────────────────
          if (data.type === "message") {
            // FIX: use normalized strings for the echo check
            const isMyEcho = dataSenderId === myUserId;

            if (isMyEcho) {
              // Our own message echoed back — confirm delivery only, do NOT
              // re-add it to the message list (was causing customer echo bug)
              if (data.local_id) {
                await chatService.confirmMessage(
                  myUserId, data.local_id, data.id, data.conversation_id,
                );
              }
              return;
            }

            // Message FROM someone else TO us
            const senderRole: "farmer" | "customer" =
              data.sender_role === "farmer" ? "farmer" : "customer";

            await chatService.getOrCreateConversation(myUserId, {
              participantId:   dataSenderId,
              participantName: data.sender_name  || "Unknown",
              participantRole: senderRole,
              serverConvoId:   String(data.conversation_id ?? "").trim(),
            });

            const msg: Message = {
              id:             data.id,
              conversationId: String(data.conversation_id ?? "").trim(),
              senderId:       dataSenderId,
              senderName:     data.sender_name  || "",
              receiverId:     String(data.receiver_id ?? "").trim(),
              receiverName:   data.receiver_name || "",
              text:           data.text,
              createdAt:      data.created_at,
              read:           false,
              pending:        false,
              synced:         true,
            };

            await chatService.receiveMessage(myUserId, msg);
            this._notifyMsg(msg);
          }
        } catch (e) {
          console.warn("chatSocket parse error:", e);
        }
      };

      this.ws.onerror = (e) => {
        console.warn("chatSocket error:", e);
      };

      this.ws.onclose = () => {
        this._notifyStatus(false);
        if (!this.destroyed) this._scheduleRetry();
      };

    } catch {
      if (!this.destroyed) this._scheduleRetry();
    }
  }

  private async _flushPending(): Promise<void> {
    const pending = await chatService.getPendingMessages(this.userId);
    for (const msg of pending) {
      if (this.ws?.readyState !== WebSocket.OPEN) break;
      this.ws.send(JSON.stringify({
        type:            "message",
        local_id:        msg.localId || msg.id,
        receiver_id:     msg.receiverId,
        text:            msg.text,
        conversation_id: msg.conversationId,
      }));
      await new Promise(r => setTimeout(r, 60));
    }
  }

  private _scheduleRetry(): void {
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
    this.retryCount++;
    this.retryTimer = setTimeout(() => this._open(), delay);
  }

  private _notifyMsg(msg: Message): void {
    this.msgListeners.forEach(fn => fn(msg));
  }

  private _notifyStatus(online: boolean): void {
    this.statusListeners.forEach(fn => fn(online));
  }
}

export const chatSocket = new ChatSocket();