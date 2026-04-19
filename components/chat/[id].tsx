import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/components/context/AuthContext";
import { chatService, Message } from "@/components/services/chatService";

const POLL_INTERVAL_MS = 8000; // poll every 8 seconds when online

// ─── Status tick icons ────────────────────────────────────────────────────────
function StatusTick({ status }: { status: Message["status"] }) {
  if (status === "sending") return <Text style={{ color: "#95D5B2", fontSize: 11 }}>⏳</Text>;
  if (status === "failed")  return <Text style={{ color: "#EF4444", fontSize: 11 }}>!</Text>;
  if (status === "sent")    return <Text style={{ color: "#95D5B2", fontSize: 11 }}>✓</Text>;
  return <Text style={{ color: "#52B788", fontSize: 11 }}>✓✓</Text>; // delivered
}

// ─── Single message bubble ────────────────────────────────────────────────────
function MessageBubble({ message, isMe }: { message: Message; isMe: boolean }) {
  const time = new Date(message.createdAt).toLocaleTimeString("en", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View
      style={{
        alignSelf: isMe ? "flex-end" : "flex-start",
        maxWidth: "75%",
        marginBottom: 8,
      }}
    >
      <View
        style={{
          backgroundColor: isMe ? "#1B4332" : "#FFFFFF",
          borderRadius: 18,
          borderBottomRightRadius: isMe ? 4 : 18,
          borderBottomLeftRadius: isMe ? 18 : 4,
          paddingHorizontal: 14,
          paddingVertical: 9,
        }}
      >
        <Text style={{ color: isMe ? "#D8F3DC" : "#1B4332", fontSize: 15, lineHeight: 21 }}>
          {message.text}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: isMe ? "flex-end" : "flex-start",
          alignItems: "center",
          gap: 4,
          marginTop: 3,
          paddingHorizontal: 4,
        }}
      >
        <Text style={{ color: "#95D5B2", fontSize: 11 }}>{time}</Text>
        {isMe && <StatusTick status={message.status} />}
      </View>
    </View>
  );
}

// ─── Conversation Screen ──────────────────────────────────────────────────────
export default function ConversationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    role: string;
    participantId: string;
  }>();

  const conversationId = params.id;
  const participantName = params.name ?? "Chat";

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load initial messages ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const msgs = await chatService.getMessages(conversationId);
      setMessages(msgs);
      setLoading(false);
      scrollToBottom();
    })();
  }, [conversationId]);

  // ── Poll for incoming messages ─────────────────────────────────────────────
  useEffect(() => {
    pollTimer.current = setInterval(async () => {
      const incoming = await chatService.pollIncoming(conversationId);
      if (incoming.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const fresh = incoming.filter((m) => !ids.has(m.id));
          return fresh.length > 0
            ? [...prev, ...fresh].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              )
            : prev;
        });
        scrollToBottom();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [conversationId]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // ── Send a message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !user?.id) return;

    setText("");

    // Optimistic: show immediately in the list
    const optimistic = await chatService.sendMessage(
      conversationId,
      user.id,
      params.participantId,
      trimmed
    );

    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    // After sending, reflect the final status from storage
    setTimeout(async () => {
      const updated = await chatService.getMessages(conversationId);
      setMessages(updated);
    }, 2000);
  }, [text, user, conversationId, params.participantId, scrollToBottom]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#F0FAF4" }}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 0.5,
            borderBottomColor: "#B7E4C7",
            backgroundColor: "#FFFFFF",
          }}
        >
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
            <Text style={{ color: "#1B4332", fontSize: 22 }}>←</Text>
          </TouchableOpacity>

          <View
            style={{
              width: 38, height: 38, borderRadius: 12,
              backgroundColor: params.role === "farmer" ? "#D8F3DC" : "#DBEAFE",
              alignItems: "center", justifyContent: "center", marginRight: 10,
            }}
          >
            <Text style={{ fontWeight: "700", fontSize: 14, color: params.role === "farmer" ? "#1B4332" : "#1E40AF" }}>
              {participantName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: "#1B4332", fontWeight: "700", fontSize: 16 }}>{participantName}</Text>
            <Text style={{ color: "#52B788", fontSize: 12, marginTop: 1 }}>
              {params.role === "farmer" ? "🌱 Farmer" : "🛍️ Customer"}
            </Text>
          </View>
        </View>

        {/* Messages */}
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#52B788" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
            renderItem={({ item }) => (
              <MessageBubble message={item} isMe={item.senderId === user?.id} />
            )}
            ListEmptyComponent={
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", marginTop: 80 }}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>👋</Text>
                <Text style={{ color: "#1B4332", fontWeight: "700" }}>Say hello!</Text>
                <Text style={{ color: "#95D5B2", fontSize: 13, marginTop: 4 }}>
                  Messages send when you are offline and deliver when connected.
                </Text>
              </View>
            }
          />
        )}

        {/* Input bar */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 10,
              padding: 12,
              paddingBottom: 16,
              borderTopWidth: 0.5,
              borderTopColor: "#B7E4C7",
              backgroundColor: "#FFFFFF",
            }}
          >
            <View
              style={{
                flex: 1,
                borderWidth: 1.5,
                borderColor: text ? "#52B788" : "#D8F3DC",
                borderRadius: 22,
                paddingHorizontal: 14,
                paddingVertical: 8,
                maxHeight: 120,
                backgroundColor: "#F0FAF4",
              }}
            >
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Type a message…"
                placeholderTextColor="#B7E4C7"
                multiline
                style={{ color: "#1B4332", fontSize: 15, lineHeight: 21 }}
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
              />
            </View>

            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: text.trim() ? "#1B4332" : "#D8F3DC",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 20 }}>↑</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

      </SafeAreaView>
    </View>
  );
}