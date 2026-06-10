import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Message {
  id:             string;
  localId?:       string;
  conversationId: string;
  senderId:       string;
  senderName:     string;
  receiverId:     string;
  receiverName:   string;
  text:           string;
  createdAt:      string;
  read:           boolean;
  pending:        boolean;
  synced:         boolean;
}

export interface Conversation {
  id:               string;
  participantId:    string;
  participantName:  string;  // always the OTHER person's name
  participantRole:  "farmer" | "customer";
  participantPhone?: string;
  lastMessage:      string;
  lastMessageAt:    string;
  unreadCount:      number;
  createdAt:        string;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

// ── Keys are scoped per user — no bleed between accounts ─────────────────────
function KEYS(userId: string) {
  return {
    conversations: `chat:${userId}:convos`,
    messages:      (id: string) => `chat:${userId}:msgs:${id}`,
    pending:       `chat:${userId}:pending`,
  };
}

export function makeUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

async function write(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function isExpired(isoDate: string): boolean {
  return Date.now() - new Date(isoDate).getTime() > THREE_DAYS_MS;
}

export const chatService = {

  // ── Purge expired conversations for this user ─────────────────────────────
  async purgeExpired(userId: string): Promise<void> {
    const keys    = KEYS(userId);
    const convos  = await read<Conversation[]>(keys.conversations, []);
    const alive   = convos.filter(c => !isExpired(c.lastMessageAt || c.createdAt));
    const expired = convos.filter(c => isExpired(c.lastMessageAt || c.createdAt));
    await Promise.all(expired.map(c => AsyncStorage.removeItem(keys.messages(c.id))));
    await write(keys.conversations, alive);
  },

  // ── Get conversations for THIS user only ──────────────────────────────────
  async getConversations(userId: string): Promise<Conversation[]> {
    await chatService.purgeExpired(userId);
    const convos = await read<Conversation[]>(KEYS(userId).conversations, []);
    return convos.sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  },

  // ── Get or create a conversation scoped to this user ──────────────────────
  async getOrCreateConversation(
    currentUserId: string,
    params: {
      participantId:    string;
      participantName:  string;  // the OTHER person's name
      participantRole:  "farmer" | "customer";
      participantPhone?: string;
      serverConvoId?:   string;
    }
  ): Promise<Conversation> {
    const keys = KEYS(currentUserId);
    const all  = await read<Conversation[]>(keys.conversations, []);

    const existing = all.find(
      c => c.participantId === params.participantId ||
           (params.serverConvoId && c.id === params.serverConvoId)
    );

    if (existing) {
      // Update phone if now available
      if (params.participantPhone && !existing.participantPhone) {
        existing.participantPhone = params.participantPhone;
        await write(keys.conversations, all);
      }
      return existing;
    }

    const convo: Conversation = {
      id:               params.serverConvoId || makeUUID(),
      participantId:    params.participantId,
      participantName:  params.participantName,   // always OTHER person
      participantRole:  params.participantRole,
      participantPhone: params.participantPhone,
      lastMessage:      "",
      lastMessageAt:    new Date().toISOString(),
      unreadCount:      0,
      createdAt:        new Date().toISOString(),
    };

    await write(keys.conversations, [convo, ...all]);
    return convo;
  },

  // ── Get messages for a conversation ───────────────────────────────────────
  async getMessages(userId: string, conversationId: string): Promise<Message[]> {
    const msgs = await read<Message[]>(KEYS(userId).messages(conversationId), []);
    return msgs.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  },

  // ── Send a message ─────────────────────────────────────────────────────────
  async sendMessage(
    userId: string,
    params: {
      conversationId: string;
      senderId:       string;
      senderName:     string;
      receiverId:     string;
      receiverName:   string;
      text:           string;
    }
  ): Promise<Message> {
    const keys    = KEYS(userId);
    const localId = makeUUID();
    const msg: Message = {
      id: localId, localId,
      conversationId: params.conversationId,
      senderId:       params.senderId,
      senderName:     params.senderName,
      receiverId:     params.receiverId,
      receiverName:   params.receiverName,
      text:           params.text.trim(),
      createdAt:      new Date().toISOString(),
      read: true, pending: true, synced: false,
    };

    const existing = await read<Message[]>(keys.messages(params.conversationId), []);
    await write(keys.messages(params.conversationId), [...existing, msg]);
    await chatService._updatePreview(userId, params.conversationId, msg.text, msg.createdAt, false);

    const pending = await read<Message[]>(keys.pending, []);
    await write(keys.pending, [...pending, msg]);
    return msg;
  },

  // ── Confirm message synced to server ──────────────────────────────────────
  async confirmMessage(
    userId: string, localId: string, serverId: string, conversationId: string
  ): Promise<void> {
    const keys = KEYS(userId);
    const msgs = await read<Message[]>(keys.messages(conversationId), []);
    await write(keys.messages(conversationId),
      msgs.map(m => (m.localId === localId || m.id === localId)
        ? { ...m, id: serverId, pending: false, synced: true } : m)
    );
    const pending = await read<Message[]>(keys.pending, []);
    await write(keys.pending, pending.filter(m => m.localId !== localId && m.id !== localId));
  },

  // ── Receive an incoming message (from WebSocket) ───────────────────────────
  async receiveMessage(userId: string, msg: Message): Promise<void> {
    const keys    = KEYS(userId);
    const existing = await read<Message[]>(keys.messages(msg.conversationId), []);
    if (existing.some(m => m.id === msg.id || m.localId === msg.id)) return;
    await write(keys.messages(msg.conversationId),
      [...existing, { ...msg, pending: false, synced: true }].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    );
    await chatService._updatePreview(userId, msg.conversationId, msg.text, msg.createdAt, true);
  },

  // ── Mark messages as read ─────────────────────────────────────────────────
  async markAsRead(userId: string, conversationId: string): Promise<void> {
    const keys = KEYS(userId);
    const msgs = await read<Message[]>(keys.messages(conversationId), []);
    await write(keys.messages(conversationId),
      msgs.map(m => m.senderId !== userId ? { ...m, read: true } : m)
    );
    const convos = await read<Conversation[]>(keys.conversations, []);
    await write(keys.conversations,
      convos.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
    );
  },

  // ── Get pending (offline) messages for sync ───────────────────────────────
  async getPendingMessages(userId: string): Promise<Message[]> {
    return read<Message[]>(KEYS(userId).pending, []);
  },

  // ── Delete a conversation ─────────────────────────────────────────────────
  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    const keys = KEYS(userId);
    const all  = await read<Conversation[]>(keys.conversations, []);
    await write(keys.conversations, all.filter(c => c.id !== conversationId));
    await AsyncStorage.removeItem(keys.messages(conversationId));
    const pending = await read<Message[]>(keys.pending, []);
    await write(keys.pending, pending.filter(m => m.conversationId !== conversationId));
  },

  // ── Total unread for badge ────────────────────────────────────────────────
  async getTotalUnread(userId: string): Promise<number> {
    const all = await read<Conversation[]>(KEYS(userId).conversations, []);
    return all.reduce((s, c) => s + (c.unreadCount || 0), 0);
  },

  // ── Clear all chat data for this user (on logout) ─────────────────────────
  async clearAll(userId: string): Promise<void> {
    const keys     = await AsyncStorage.getAllKeys();
    const chatKeys = keys.filter(k => k.startsWith(`chat:${userId}:`));
    if (chatKeys.length) await AsyncStorage.multiRemove(chatKeys);
  },

  // ── Internal: update conversation preview ─────────────────────────────────
  async _updatePreview(
    userId: string, convoId: string, text: string, at: string, inc: boolean
  ): Promise<void> {
    const keys = KEYS(userId);
    const all  = await read<Conversation[]>(keys.conversations, []);
    await write(keys.conversations, all.map(c => c.id !== convoId ? c : {
      ...c, lastMessage: text, lastMessageAt: at,
      unreadCount: inc ? (c.unreadCount || 0) + 1 : c.unreadCount,
    }));
  },
  
};
