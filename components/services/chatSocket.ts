import Constants from "expo-constants";
import { chatService, Message } from "./chatService";

const RAW_URL   = Constants.expoConfig?.extra?.API_URL || "http://localhost:8000";
const WS_BASE   = RAW_URL.replace(/^http/, "ws");

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

  // ── Public API ──────────────────────────────────────────────────────────────

  connect(token: string, userId: string): void {
    this.token    = token;
    this.userId   = userId;
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

  /** Send a message. Returns true if sent via WS, false if offline. */
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

  // ── Internal ────────────────────────────────────────────────────────────────

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

          if (data.type === "delivered" && data.local_id) {
            await chatService.confirmMessage(
              data.local_id, data.message_id, data.conversation_id
            );
            return;
          }

          if (data.type === "message") {
            const msg: Message = {
              id:             data.id,
              conversationId: data.conversation_id,
              senderId:       data.sender_id,
              senderName:     data.sender_name || "",
              receiverId:     data.receiver_id,
              text:           data.text,
              createdAt:      data.created_at,
              read:           data.sender_id === this.userId,
              pending:        false,
              synced:         true,
            };

            if (data.sender_id === this.userId && data.local_id) {
              // Echo of our own message — confirm it
              await chatService.confirmMessage(
                data.local_id, data.id, data.conversation_id
              );
            } else {
              // Incoming from other person
              await chatService.receiveMessage(msg);
            }

            this._notifyMsg(msg);
          }
        } catch { /* ignore malformed */ }
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

  /** Flush messages that were composed while offline */
  private async _flushPending(): Promise<void> {
    const pending = await chatService.getPendingMessages();
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
