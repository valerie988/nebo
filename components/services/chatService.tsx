import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

const API_URL = "http://172.20.10.2:8000"; 

// ─── Types ─

export type MessageStatus = "sending" | "sent" | "delivered" | "failed";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;       // ISO string
  status: MessageStatus;
  pending: boolean;        // true = not yet synced to server
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: "farmer" | "customer";
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  conversations: "chat:conversations",
  messages: (convoId: string) => `chat:messages:${convoId}`,
  pending: "chat:pending",                 // queue of unsynced messages
  lastSync: (convoId: string) => `chat:lastSync:${convoId}`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJSON(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable === true;
}

// ─── Auth token helper — swap for however you store your token ────────────────
async function getAuthToken(): Promise<string> {
  return (await AsyncStorage.getItem("auth:token")) ?? "";
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
}

// ─── Chat Service ─────────────────────────────────────────────────────────────

export const chatService = {

  // ── Get all conversations (local first) ─────────────────────────────────────
  async getConversations(): Promise<Conversation[]> {
    const local = await readJSON<Conversation[]>(KEYS.conversations, []);

    // Fetch fresh from server in background — don't block the UI
    isOnline().then(async (online) => {
      if (!online) return;
      try {
        const res = await apiFetch("/conversations");
        if (!res.ok) return;
        const data: Conversation[] = await res.json();

        // Merge: keep local unread counts for any convo not returned by server
        const merged = data.map((serverConvo) => {
          const localConvo = local.find((l) => l.id === serverConvo.id);
          return { ...serverConvo, unreadCount: localConvo?.unreadCount ?? serverConvo.unreadCount };
        });

        await writeJSON(KEYS.conversations, merged);
      } catch {
        // Silently ignore — we already served local data
      }
    });

    return local;
  },

  // ── Get messages for a conversation ─────────────────────────────────────────
  async getMessages(conversationId: string): Promise<Message[]> {
    const local = await readJSON<Message[]>(KEYS.messages(conversationId), []);

    // Pull server messages in background
    isOnline().then(async (online) => {
      if (!online) return;
      try {
        const lastSync = await AsyncStorage.getItem(KEYS.lastSync(conversationId));
        const query = lastSync ? `?after=${encodeURIComponent(lastSync)}` : "";
        const res = await apiFetch(`/conversations/${conversationId}/messages${query}`);
        if (!res.ok) return;

        const serverMessages: Message[] = await res.json();
        if (serverMessages.length === 0) return;

        // Merge without duplicates
        const existingIds = new Set(local.map((m) => m.id));
        const fresh = serverMessages.filter((m) => !existingIds.has(m.id));
        const merged = [...local, ...fresh].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        await writeJSON(KEYS.messages(conversationId), merged);
        await AsyncStorage.setItem(KEYS.lastSync(conversationId), new Date().toISOString());
      } catch {
        // Serve local data as fallback
      }
    });

    return local.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  },

  // ── Send a message ───────────────────────────────────────────────────────────
  async sendMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    text: string
  ): Promise<Message> {
    const message: Message = {
      id: uuid(),
      conversationId,
      senderId,
      receiverId,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      status: "sending",
      pending: true,
    };

    // 1. Save locally immediately — UI never waits for the network
    const existing = await readJSON<Message[]>(KEYS.messages(conversationId), []);
    await writeJSON(KEYS.messages(conversationId), [...existing, message]);

    // 2. Update the conversation preview
    await chatService._updateConversationPreview(conversationId, message);

    // 3. Add to pending queue
    const pending = await readJSON<Message[]>(KEYS.pending, []);
    await writeJSON(KEYS.pending, [...pending, message]);

    // 4. Try to send right now if online
    const online = await isOnline();
    if (online) {
      await chatService._trySendOne(message);
    }

    return message;
  },

  // ── Sync all pending messages to the server ──────────────────────────────────
  async syncPending(): Promise<void> {
    const online = await isOnline();
    if (!online) return;

    const pending = await readJSON<Message[]>(KEYS.pending, []);
    if (pending.length === 0) return;

    const stillPending: Message[] = [];

    for (const message of pending) {
      const success = await chatService._trySendOne(message);
      if (!success) stillPending.push(message);
    }

    await writeJSON(KEYS.pending, stillPending);
  },

  // ── Internal: attempt to POST one message to the server ─────────────────────
  async _trySendOne(message: Message): Promise<boolean> {
    try {
      const res = await apiFetch(`/conversations/${message.conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          id: message.id,           // idempotency key — server ignores duplicates
          senderId: message.senderId,
          receiverId: message.receiverId,
          text: message.text,
          createdAt: message.createdAt,
        }),
      });

      if (!res.ok) return false;

      // Mark as delivered in local storage
      await chatService._updateMessageStatus(message.conversationId, message.id, "delivered");
      return true;
    } catch {
      await chatService._updateMessageStatus(message.conversationId, message.id, "failed");
      return false;
    }
  },

  // ── Mark all messages in a conversation as read ──────────────────────────────
  async markAsRead(conversationId: string): Promise<void> {
    const convos = await readJSON<Conversation[]>(KEYS.conversations, []);
    const updated = convos.map((c) =>
      c.id === conversationId ? { ...c, unreadCount: 0 } : c
    );
    await writeJSON(KEYS.conversations, updated);

    // Tell the server in background
    isOnline().then(async (online) => {
      if (!online) return;
      try {
        await apiFetch(`/conversations/${conversationId}/read`, { method: "POST" });
      } catch {
        // Non-critical — local count already cleared
      }
    });
  },

  // ── Poll for new incoming messages (call every ~10s while screen is open) ────
  async pollIncoming(conversationId: string): Promise<Message[]> {
    const online = await isOnline();
    if (!online) return [];

    try {
      const lastSync = await AsyncStorage.getItem(KEYS.lastSync(conversationId));
      const query = lastSync ? `?after=${encodeURIComponent(lastSync)}` : "";
      const res = await apiFetch(`/conversations/${conversationId}/messages${query}`);
      if (!res.ok) return [];

      const serverMessages: Message[] = await res.json();
      if (serverMessages.length === 0) return [];

      const existing = await readJSON<Message[]>(KEYS.messages(conversationId), []);
      const existingIds = new Set(existing.map((m) => m.id));
      const incoming = serverMessages.filter((m) => !existingIds.has(m.id));

      if (incoming.length > 0) {
        const merged = [...existing, ...incoming].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        await writeJSON(KEYS.messages(conversationId), merged);

        // Update conversation preview with latest incoming message
        const latest = incoming[incoming.length - 1];
        await chatService._updateConversationPreview(conversationId, latest);
      }

      await AsyncStorage.setItem(KEYS.lastSync(conversationId), new Date().toISOString());
      return incoming;
    } catch {
      return [];
    }
  },

  // ── Internal: update conversation list preview after a message ───────────────
  async _updateConversationPreview(conversationId: string, message: Message): Promise<void> {
    const convos = await readJSON<Conversation[]>(KEYS.conversations, []);
    const updated = convos.map((c) => {
      if (c.id !== conversationId) return c;
      return {
        ...c,
        lastMessage: message.text,
        lastMessageAt: message.createdAt,
      };
    });
    await writeJSON(KEYS.conversations, updated);
  },

  // ── Internal: update a single message's status in local storage ──────────────
  async _updateMessageStatus(
    conversationId: string,
    messageId: string,
    status: MessageStatus
  ): Promise<void> {
    const messages = await readJSON<Message[]>(KEYS.messages(conversationId), []);
    const updated = messages.map((m) =>
      m.id === messageId ? { ...m, status, pending: status !== "delivered" } : m
    );
    await writeJSON(KEYS.messages(conversationId), updated);
  },

  // ── Create a new conversation (called before first message) ──────────────────
  async createConversation(
    participantId: string,
    participantName: string,
    participantRole: "farmer" | "customer"
  ): Promise<Conversation> {
    const conversation: Conversation = {
      id: uuid(),
      participantId,
      participantName,
      participantRole,
      lastMessage: "",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
    };

    const existing = await readJSON<Conversation[]>(KEYS.conversations, []);

    // Don't create duplicates — return existing if participant already has a convo
    const dupe = existing.find((c) => c.participantId === participantId);
    if (dupe) return dupe;

    await writeJSON(KEYS.conversations, [conversation, ...existing]);

    // Register on server in background
    isOnline().then(async (online) => {
      if (!online) return;
      try {
        await apiFetch("/conversations", {
          method: "POST",
          body: JSON.stringify({
            id: conversation.id,
            participantId,
          }),
        });
      } catch {
        // Will retry next sync
      }
    });

    return conversation;
  },

  // ── Wipe all local chat data (logout / account switch) ───────────────────────
  async clearAll(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const chatKeys = keys.filter((k) => k.startsWith("chat:"));
    await AsyncStorage.multiRemove(chatKeys);
  },
};