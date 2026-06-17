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
  id:                string;
  participantId:     string;
  participantName:   string;
  participantRole:   "farmer" | "customer";
  participantPhone?: string;
  lastMessage:       string;
  lastMessageAt:     string;
  unreadCount:       number;
  createdAt:         string;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

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
  } catch {
    return fallback;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function isExpired(isoDate: string): boolean {
  return Date.now() - new Date(isoDate).getTime() > THREE_DAYS_MS;
}

export const chatService = {

  async purgeExpired(userId: string): Promise<void> {
    const keys   = KEYS(userId);
    const convos = await read<Conversation[]>(keys.conversations, []);
    const alive   = convos.filter(c => !isExpired(c.lastMessageAt || c.createdAt));
    const expired = convos.filter(c =>  isExpired(c.lastMessageAt || c.createdAt));
    await Promise.all(expired.map(c => AsyncStorage.removeItem(keys.messages(c.id))));
    await write(keys.conversations, alive);
  },

  async getConversations(userId: string): Promise<Conversation[]> {
    await chatService.purgeExpired(userId);
    const convos = await read<Conversation[]>(KEYS(userId).conversations, []);
    return convos.sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
  },

  async getOrCreateConversation(
    currentUserId: string,
    params: {
      participantId:     string;
      participantName:   string;
      participantRole:   "farmer" | "customer";
      participantPhone?: string;
      serverConvoId?:    string;
    },
  ): Promise<Conversation> {
    const keys = KEYS(currentUserId);
    const all  = await read<Conversation[]>(keys.conversations, []);

    const normalizedParticipantId = String(params.participantId).trim();
    const normalizedServerConvoId = params.serverConvoId
      ? String(params.serverConvoId).trim()
      : undefined;

    const existing = all.find(
      c =>
        String(c.participantId).trim() === normalizedParticipantId ||
        (normalizedServerConvoId && String(c.id).trim() === normalizedServerConvoId),
    );

    if (existing) {
      let changed = false;

      if (params.participantPhone && !existing.participantPhone) {
        existing.participantPhone = params.participantPhone;
        changed = true;
      }
      if (existing.participantRole !== params.participantRole) {
        existing.participantRole = params.participantRole;
        changed = true;
      }
      if (params.participantName && existing.participantName !== params.participantName) {
        existing.participantName = params.participantName;
        changed = true;
      }
      if (existing.participantId !== normalizedParticipantId) {
        existing.participantId = normalizedParticipantId;
        changed = true;
      }

      if (changed) await write(keys.conversations, all);
      return existing;
    }

    const convo: Conversation = {
      id:               normalizedServerConvoId || makeUUID(),
      participantId:    normalizedParticipantId,
      participantName:  params.participantName,
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

  async getMessages(userId: string, conversationId: string): Promise<Message[]> {
    const msgs = await read<Message[]>(KEYS(userId).messages(conversationId), []);
    return msgs.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  },

  async sendMessage(
    userId: string,
    params: {
      conversationId: string;
      senderId:       string;
      senderName:     string;
      receiverId:     string;
      receiverName:   string;
      text:           string;
    },
  ): Promise<Message> {
    const keys    = KEYS(userId);
    const localId = makeUUID();
    const msg: Message = {
      id:             localId,
      localId,
      conversationId: params.conversationId,
      senderId:       String(params.senderId).trim(),
      senderName:     params.senderName,
      receiverId:     String(params.receiverId).trim(),
      receiverName:   params.receiverName,
      text:           params.text.trim(),
      createdAt:      new Date().toISOString(),
      read:           true,
      pending:        true,
      synced:         false,
    };

    const existing = await read<Message[]>(keys.messages(params.conversationId), []);
    await write(keys.messages(params.conversationId), [...existing, msg]);
    await chatService._updatePreview(
      userId, params.conversationId, msg.text, msg.createdAt, false,
    );

    const pending = await read<Message[]>(keys.pending, []);
    await write(keys.pending, [...pending, msg]);
    return msg;
  },

  async confirmMessage(
    userId: string,
    localId: string,
    serverId: string,
    conversationId: string,
  ): Promise<void> {
    const keys = KEYS(userId);
    const msgs = await read<Message[]>(keys.messages(conversationId), []);
    await write(
      keys.messages(conversationId),
      msgs.map(m =>
        m.localId === localId || m.id === localId
          ? { ...m, id: serverId, pending: false, synced: true }
          : m,
      ),
    );
    const pending = await read<Message[]>(keys.pending, []);
    await write(
      keys.pending,
      pending.filter(m => m.localId !== localId && m.id !== localId),
    );
  },

  async receiveMessage(userId: string, msg: Message): Promise<void> {
    const keys     = KEYS(userId);
    const existing = await read<Message[]>(keys.messages(msg.conversationId), []);
    if (existing.some(m => m.id === msg.id || m.localId === msg.id)) return;

    await write(
      keys.messages(msg.conversationId),
      [...existing, { ...msg, pending: false, synced: true }].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    );
    await chatService._updatePreview(
      userId, msg.conversationId, msg.text, msg.createdAt, true,
    );
  },

  /**
   * Stores a message that the current user SENT (synced from server).
   * Unlike receiveMessage, this does NOT increment unread count and marks
   * the message as synced+read so it renders on the right (isMe=true).
   */
  async storeSentMessage(
    userId: string,
    params: {
      id:             string;
      conversationId: string;
      senderId:       string;
      senderName:     string;
      receiverId:     string;
      receiverName:   string;
      text:           string;
      createdAt:      string;
    },
  ): Promise<void> {
    const keys     = KEYS(userId);
    const existing = await read<Message[]>(keys.messages(params.conversationId), []);
    // Skip if already stored (by local send or prior sync)
    if (existing.some(m => m.id === params.id || m.localId === params.id)) return;

    const msg: Message = {
      id:             params.id,
      conversationId: params.conversationId,
      senderId:       params.senderId,
      senderName:     params.senderName,
      receiverId:     params.receiverId,
      receiverName:   params.receiverName,
      text:           params.text,
      createdAt:      params.createdAt,
      read:           true,    // we sent it — always read
      pending:        false,
      synced:         true,
    };

    await write(
      keys.messages(params.conversationId),
      [...existing, msg].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    );
    // inc=false → do NOT bump unread count for our own messages
    await chatService._updatePreview(
      userId, params.conversationId, params.text, params.createdAt, false,
    );
  },

  async markAsRead(userId: string, conversationId: string): Promise<void> {
    const keys = KEYS(userId);
    const msgs = await read<Message[]>(keys.messages(conversationId), []);
    await write(
      keys.messages(conversationId),
      msgs.map(m => (m.senderId !== userId ? { ...m, read: true } : m)),
    );
    const convos = await read<Conversation[]>(keys.conversations, []);
    await write(
      keys.conversations,
      convos.map(c => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
    );
  },

  async getPendingMessages(userId: string): Promise<Message[]> {
    return read<Message[]>(KEYS(userId).pending, []);
  },

  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    const keys = KEYS(userId);
    const all  = await read<Conversation[]>(keys.conversations, []);
    await write(keys.conversations, all.filter(c => c.id !== conversationId));
    await AsyncStorage.removeItem(keys.messages(conversationId));
    const pending = await read<Message[]>(keys.pending, []);
    await write(
      keys.pending,
      pending.filter(m => m.conversationId !== conversationId),
    );
  },

  async getTotalUnread(userId: string): Promise<number> {
    const all = await read<Conversation[]>(KEYS(userId).conversations, []);
    return all.reduce((s, c) => s + (c.unreadCount || 0), 0);
  },

  async clearAll(userId: string): Promise<void> {
    const keys     = await AsyncStorage.getAllKeys();
    const chatKeys = keys.filter(k => k.startsWith(`chat:${userId}:`));
    if (chatKeys.length) await AsyncStorage.multiRemove(chatKeys);
  },

  async _updatePreview(
    userId: string,
    convoId: string,
    text: string,
    at: string,
    inc: boolean,
  ): Promise<void> {
    const keys = KEYS(userId);
    const all  = await read<Conversation[]>(keys.conversations, []);
    await write(
      keys.conversations,
      all.map(c =>
        c.id !== convoId
          ? c
          : {
              ...c,
              lastMessage:   text,
              lastMessageAt: at,
              unreadCount:   inc ? (c.unreadCount || 0) + 1 : c.unreadCount,
            },
      ),
    );
  },
};