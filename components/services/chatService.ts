import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Message {
  id: string;
  localId?: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  createdAt: string;
  read: boolean;
  pending: boolean;
  synced: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: "farmer" | "customer";
  participantPhone?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
}

const KEYS = {
  conversations: "chat:convos",
  messages: (id: string) => `chat:msgs:${id}`,
  pending: "chat:pending",
};

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

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
  async purgeExpired(): Promise<void> {
    const convos = await read<Conversation[]>(KEYS.conversations, []);
    const alive = convos.filter(
      (c) => !isExpired(c.lastMessageAt || c.createdAt),
    );
    const expired = convos.filter((c) =>
      isExpired(c.lastMessageAt || c.createdAt),
    );
    await Promise.all(
      expired.map((c) => AsyncStorage.removeItem(KEYS.messages(c.id))),
    );
    await write(KEYS.conversations, alive);
  },

  async getConversations(
    myRole?: "farmer" | "customer",
  ): Promise<Conversation[]> {
    await chatService.purgeExpired();
    const convos = await read<Conversation[]>(KEYS.conversations, []);

    // If you pass a role, you could filter them here,
    // but typically you want all and filter in the UI.
    return convos.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime(),
    );
  },

  async getOrCreateConversation(params: {
    participantId: string;
    participantName: string;
    participantRole: "farmer" | "customer";
    participantPhone?: string;
    serverConvoId?: string;
  }): Promise<Conversation> {
    const all = await read<Conversation[]>(KEYS.conversations, []);
    const existing = all.find(
      (c) =>
        c.participantId === params.participantId ||
        (params.serverConvoId && c.id === params.serverConvoId),
    );
    if (existing) {
      if (params.participantPhone && !existing.participantPhone) {
        existing.participantPhone = params.participantPhone;
        await write(KEYS.conversations, all);
      }
      return existing;
    }
    const convo: Conversation = {
      id: params.serverConvoId || makeUUID(),
      participantId: params.participantId,
      participantName: params.participantName,
      participantRole: params.participantRole,
      participantPhone: params.participantPhone,
      lastMessage: "",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      createdAt: new Date().toISOString(),
    };
    await write(KEYS.conversations, [convo, ...all]);
    return convo;
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const msgs = await read<Message[]>(KEYS.messages(conversationId), []);
    return msgs.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  },

  async sendMessage(params: {
    conversationId: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    text: string;
  }): Promise<Message> {
    const localId = makeUUID();
    const msg: Message = {
      id: localId,
      localId,
      conversationId: params.conversationId,
      senderId: params.senderId,
      senderName: params.senderName,
      receiverId: params.receiverId,
      text: params.text.trim(),
      createdAt: new Date().toISOString(),
      read: true,
      pending: true,
      synced: false,
    };
    const existing = await read<Message[]>(
      KEYS.messages(params.conversationId),
      [],
    );
    await write(KEYS.messages(params.conversationId), [...existing, msg]);
    await chatService._updatePreview(
      params.conversationId,
      msg.text,
      msg.createdAt,
      false,
    );
    const pending = await read<Message[]>(KEYS.pending, []);
    await write(KEYS.pending, [...pending, msg]);
    return msg;
  },

  async confirmMessage(
    localId: string,
    serverId: string,
    conversationId: string,
  ): Promise<void> {
    const msgs = await read<Message[]>(KEYS.messages(conversationId), []);
    await write(
      KEYS.messages(conversationId),
      msgs.map((m) =>
        m.localId === localId || m.id === localId
          ? { ...m, id: serverId, pending: false, synced: true }
          : m,
      ),
    );
    const pending = await read<Message[]>(KEYS.pending, []);
    await write(
      KEYS.pending,
      pending.filter((m) => m.localId !== localId && m.id !== localId),
    );
  },

  async receiveMessage(msg: Message): Promise<void> {
    const existing = await read<Message[]>(
      KEYS.messages(msg.conversationId),
      [],
    );
    if (existing.some((m) => m.id === msg.id || m.localId === msg.id)) return;
    await write(
      KEYS.messages(msg.conversationId),
      [...existing, { ...msg, pending: false, synced: true }].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    );
    await chatService._updatePreview(
      msg.conversationId,
      msg.text,
      msg.createdAt,
      true,
    );
  },

  async markAsRead(
    conversationId: string,
    currentUserId: string,
  ): Promise<void> {
    const msgs = await read<Message[]>(KEYS.messages(conversationId), []);
    await write(
      KEYS.messages(conversationId),
      msgs.map((m) =>
        m.senderId !== currentUserId ? { ...m, read: true } : m,
      ),
    );
    const convos = await read<Conversation[]>(KEYS.conversations, []);
    await write(
      KEYS.conversations,
      convos.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    );
  },

  async getPendingMessages(): Promise<Message[]> {
    return read<Message[]>(KEYS.pending, []);
  },

  async deleteConversation(conversationId: string): Promise<void> {
    const all = await read<Conversation[]>(KEYS.conversations, []);
    await write(
      KEYS.conversations,
      all.filter((c) => c.id !== conversationId),
    );
    await AsyncStorage.removeItem(KEYS.messages(conversationId));
    const pending = await read<Message[]>(KEYS.pending, []);
    await write(
      KEYS.pending,
      pending.filter((m) => m.conversationId !== conversationId),
    );
  },

  async getTotalUnread(): Promise<number> {
    const all = await read<Conversation[]>(KEYS.conversations, []);
    return all.reduce((s, c) => s + (c.unreadCount || 0), 0);
  },

  async _updatePreview(
    id: string,
    text: string,
    at: string,
    inc: boolean,
  ): Promise<void> {
    const all = await read<Conversation[]>(KEYS.conversations, []);
    await write(
      KEYS.conversations,
      all.map((c) =>
        c.id !== id
          ? c
          : {
              ...c,
              lastMessage: text,
              lastMessageAt: at,
              unreadCount: inc ? (c.unreadCount || 0) + 1 : c.unreadCount,
            },
      ),
    );
  },

  async clearAll(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const chatKeys = keys.filter((k) => k.startsWith("chat:"));
    if (chatKeys.length) await AsyncStorage.multiRemove(chatKeys);
  },
};
