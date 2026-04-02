import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
  synced: boolean;
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

// ─── Keys ─────────────────────────────────────────────────────────────────────
const CONVOS_KEY = "nebo_conversations";
const MESSAGES_KEY = (convoId: string) => `nebo_messages_${convoId}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function isOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Conversations ─────────────────────────────────────────────────────────────
export const chatService = {
  // Get all conversations
  getConversations: async (): Promise<Conversation[]> => {
    try {
      const raw = await AsyncStorage.getItem(CONVOS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // Save conversations list
  saveConversations: async (convos: Conversation[]): Promise<void> => {
    await AsyncStorage.setItem(CONVOS_KEY, JSON.stringify(convos));
  },

  // Get or create a conversation with a user
  getOrCreateConversation: async (
    currentUserId: string,
    participantId: string,
    participantName: string,
    participantRole: "farmer" | "customer"
  ): Promise<Conversation> => {
    const convos = await chatService.getConversations();
    const existing = convos.find((c) => c.participantId === participantId);
    if (existing) return existing;

    const newConvo: Conversation = {
      id: generateId(),
      participantId,
      participantName,
      participantRole,
      lastMessage: "",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
    };

    await chatService.saveConversations([newConvo, ...convos]);
    return newConvo;
  },

  // ─── Messages ───────────────────────────────────────────────────────────────
  getMessages: async (conversationId: string): Promise<Message[]> => {
    try {
      const raw = await AsyncStorage.getItem(MESSAGES_KEY(conversationId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  sendMessage: async (
    conversationId: string,
    senderId: string,
    receiverId: string,
    text: string
  ): Promise<Message> => {
    const message: Message = {
      id: generateId(),
      conversationId,
      senderId,
      receiverId,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      synced: false,
    };

    // Save locally first
    const existing = await chatService.getMessages(conversationId);
    await AsyncStorage.setItem(
      MESSAGES_KEY(conversationId),
      JSON.stringify([...existing, message])
    );

    // Update conversation preview
    const convos = await chatService.getConversations();
    const updated = convos.map((c) =>
      c.id === conversationId
        ? { ...c, lastMessage: text.trim(), lastMessageAt: message.createdAt, unreadCount: 0 }
        : c
    );
    await chatService.saveConversations(updated);

    // Try to sync if online
    try {
      const online = await isOnline();
      if (online) {
        const token = await AsyncStorage.getItem("nebo_token");
        const res = await fetch(`${BASE_URL}/chat/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ conversationId, receiverId, text: text.trim() }),
        });
        if (res.ok) {
          // Mark as synced
          const msgs = await chatService.getMessages(conversationId);
          const synced = msgs.map((m) =>
            m.id === message.id ? { ...m, synced: true } : m
          );
          await AsyncStorage.setItem(MESSAGES_KEY(conversationId), JSON.stringify(synced));
          return { ...message, synced: true };
        }
      }
    } catch {
      // Stay offline — message already saved locally
    }

    return message;
  },

  // Sync all unsynced messages when back online
  syncPending: async (): Promise<void> => {
    try {
      const online = await isOnline();
      if (!online) return;

      const token = await AsyncStorage.getItem("nebo_token");
      const convos = await chatService.getConversations();

      for (const convo of convos) {
        const msgs = await chatService.getMessages(convo.id);
        const unsynced = msgs.filter((m) => !m.synced);

        for (const msg of unsynced) {
          try {
            const res = await fetch(`${BASE_URL}/chat/messages`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                conversationId: msg.conversationId,
                receiverId: msg.receiverId,
                text: msg.text,
                localId: msg.id,
              }),
            });
            if (res.ok) {
              const updated = msgs.map((m) =>
                m.id === msg.id ? { ...m, synced: true } : m
              );
              await AsyncStorage.setItem(MESSAGES_KEY(convo.id), JSON.stringify(updated));
            }
          } catch {
            // Skip — will retry next sync
          }
        }
      }
    } catch {
      // Silent fail
    }
  },

  markAsRead: async (conversationId: string): Promise<void> => {
    const convos = await chatService.getConversations();
    const updated = convos.map((c) =>
      c.id === conversationId ? { ...c, unreadCount: 0 } : c
    );
    await chatService.saveConversations(updated);
  },
};