import Constants from "expo-constants";
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
    this.userId    = userId;
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
        this.retryCount = 0;
        this._notifyStatus(true);
        await this._flushPending();
      };

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          // ── Delivery confirmation for our own sent message ─────────────────
          if (data.type === "delivered" && data.local_id) {
            await chatService.confirmMessage(
              this.userId, data.local_id, data.message_id, data.conversation_id
            );
            return;
          }

          // ── Incoming message from the other person ────────────────────────
          if (data.type === "message") {
            const isMyEcho = data.sender_id === this.userId;

            if (isMyEcho && data.local_id) {
              // Echo of our own message — just confirm, don't re-add
              await chatService.confirmMessage(
                this.userId, data.local_id, data.id, data.conversation_id
              );
              return;
            }

            const senderRole = data.sender_role || "customer"; 
            await chatService.getOrCreateConversation(this.userId, {
              participantId:    data.sender_id,
              participantName:  data.sender_name,  
              participantRole:  senderRole,
              serverConvoId:    data.conversation_id,
            });

            const msg: Message = {
              id:             data.id,
              conversationId: data.conversation_id,
              senderId:       data.sender_id,
              senderName:     data.sender_name || "",
              receiverId:     data.receiver_id,
              receiverName:   data.receiver_name || "",
              text:           data.text,
              createdAt:      data.created_at,
              read:           false,
              pending:        false,
              synced:         true,
            };

            await chatService.receiveMessage(this.userId, msg);
            this._notifyMsg(msg);
          }
        } catch (e) {
          console.warn("chatSocket parse error:", e);
        }
      };

      this.ws.onerror  = () => {};
      this.ws.onclose  = () => {
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
