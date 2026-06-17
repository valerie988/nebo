import { useAuth } from "@/components/context/AuthContext";
import { chatService, Message } from "@/components/services/chatService";
import { chatSocket } from "@/components/services/chatSocket";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Resolves a consistent, trimmed string userId from whatever shape the
 * auth context returns.  Covers:  id | user_id | pk | _id
 */
function resolveUserId(user: any): string {
  if (!user) return "";
  const raw = user.id ?? user.user_id ?? "";
  return String(raw).trim();
}

function toUtc(iso: string): string {
  if (!iso) return iso;
  return iso.endsWith("Z") || iso.includes("+") || iso.includes("-", 10)
    ? iso
    : iso + "Z";
}

function parseDate(iso: string): number {
  if (!iso) return 0;
  const t = new Date(toUtc(iso)).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function formatMsgTime(iso: string): string {
  try {
    const d = new Date(toUtc(iso));
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h > 12 ? h - 12 : h || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
  } catch {
    return "";
  }
}

function isSameDay(a: string, b: string) {
  return (
    new Date(toUtc(a)).toDateString() === new Date(toUtc(b)).toDateString()
  );
}

function dayLabel(iso: string): string {
  const d = new Date(toUtc(iso));
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function sortMessages(messages: Message[]): Message[] {
  return [...messages].sort(
    (a, b) => parseDate(a.createdAt) - parseDate(b.createdAt),
  );
}

// ─── components ─────────────────────────────────────────────────────────────

function DateDivider({ label }: { label: string }) {
  return (
    <View style={{ alignItems: "center", marginVertical: 12 }}>
      <View
        style={{
          backgroundColor: "#D8F3DC",
          paddingHorizontal: 14,
          paddingVertical: 4,
          borderRadius: 99,
        }}
      >
        <Text style={{ color: "#1B4332", fontSize: 11, fontWeight: "600" }}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function Bubble({ msg, isMe }: { msg: Message; isMe: boolean }) {
  return (
    <View
      style={{
        alignItems: isMe ? "flex-end" : "flex-start",
        marginBottom: 4,
        paddingHorizontal: 12,
      }}
    >
      <View
        style={{
          maxWidth: "76%",
          backgroundColor: isMe ? "#1B4332" : "#FFFFFF",
          borderRadius: 18,
          borderBottomRightRadius: isMe ? 4 : 18,
          borderBottomLeftRadius: isMe ? 18 : 4,
          paddingHorizontal: 14,
          paddingVertical: 10,
          elevation: 1,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 3,
        }}
      >
        <Text
          style={{
            color: isMe ? "#D8F3DC" : "#1B4332",
            fontSize: 15,
            lineHeight: 22,
          }}
        >
          {msg.text}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: isMe ? "flex-end" : "flex-start",
            marginTop: 4,
            gap: 4,
          }}
        >
          <Text style={{ color: isMe ? "#52B788" : "#95D5B2", fontSize: 10 }}>
            {formatMsgTime(msg.createdAt)}
          </Text>
          {isMe && (
            <Text
              style={{
                fontSize: 10,
                color: msg.pending ? "#B7E4C7" : "#52B788",
              }}
            >
              {msg.pending ? "Sending..." : msg.synced ? "✓✓" : "✓"}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── list builder ────────────────────────────────────────────────────────────

type ListItem =
  | { type: "divider"; label: string; key: string }
  | { type: "bubble"; msg: Message; key: string };

function buildItems(messages: Message[]): ListItem[] {
  const items: ListItem[] = [];
  let lastDay = "";
  for (const msg of sortMessages(messages)) {
    if (!lastDay || !isSameDay(msg.createdAt, lastDay)) {
      items.push({
        type: "divider",
        label: dayLabel(msg.createdAt),
        key: `div-${msg.createdAt}`,
      });
      lastDay = msg.createdAt;
    }
    items.push({ type: "bubble", msg, key: msg.id });
  }
  return items;
}

// ─── screen ──────────────────────────────────────────────────────────────────

export function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    id: string;
    participantName: string;
    participantId: string;
    participantRole: string;
    participantPhone: string;
  }>();

  const convoId = params.id;
  const participantName = params.participantName ?? "Chat";
  const participantPhone = params.participantPhone || "";

  const userId = resolveUserId(user);
  const userName = user?.full_name || (user as any)?.name || "Me";

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(chatSocket.isConnected);
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const scrollToBottom = (animated = true) =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 80);

  const loadMessages = useCallback(async () => {
    if (!userId) return;
    const msgs = await chatService.getMessages(userId, convoId);
    setMessages(sortMessages(msgs));
    setLoading(false);
    scrollToBottom(false);
    await chatService.markAsRead(userId, convoId);
  }, [userId, convoId]);

  useEffect(() => {
    loadMessages();

    const connectSocket = async () => {
      const token =
        (await AsyncStorage.getItem("access_token")) ||
        (await AsyncStorage.getItem("nebo_token")) ||
        (await AsyncStorage.getItem("token"));
      if (token && userId) chatSocket.connect(token, userId);
    };
    connectSocket();

    const u1 = chatSocket.onStatus(setOnline);
    const u2 = chatSocket.onMessage(async (msg) => {
      if (msg.conversationId !== convoId) return;
      setMessages((prev) => {
        const exists = prev.some(
          (m) => m.id === msg.id || m.localId === msg.id,
        );
        if (exists) {
          return sortMessages(
            prev.map((m) =>
              m.id === msg.id || m.localId === msg.id
                ? { ...m, id: msg.id, pending: false, synced: true }
                : m,
            ),
          );
        }
        return sortMessages([...prev, msg]);
      });
      scrollToBottom(true);
      if (userId) await chatService.markAsRead(userId, convoId);
    });

    return () => {
      u1();
      u2();
    };
  }, [userId, convoId]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !userId || sending) return;
    setText("");
    setSending(true);
    try {
      const msg = await chatService.sendMessage(userId, {
        conversationId: convoId,
        senderId: userId,
        senderName: userName,
        receiverId: String(params.participantId).trim(),
        receiverName: participantName,
        text: trimmed,
      });
      setMessages((prev) => sortMessages([...prev, msg]));
      scrollToBottom(true);
      chatSocket.send({
        localId: msg.localId!,
        receiverId: String(params.participantId).trim(),
        text: trimmed,
        conversationId: convoId,
      });
    } finally {
      setSending(false);
    }
  }, [
    text,
    userId,
    userName,
    convoId,
    params.participantId,
    participantName,
    sending,
  ]);

  const handleCall = () => {
    if (!participantPhone) {
      Alert.alert(
        "No Phone Number",
        `${participantName} hasn't added a phone number.`,
      );
      return;
    }
    Alert.alert(`Call ${participantName}`, participantPhone, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call",
        onPress: () => Linking.openURL(`tel:${participantPhone}`),
      },
    ]);
  };

  const items = buildItems(messages);

  return (
    <View style={{ flex: 1, backgroundColor: "#F0FAF4" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: "#FFFFFF",
            borderBottomWidth: 0.5,
            borderBottomColor: "#D8F3DC",
            elevation: 2,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 4,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 12, padding: 4 }}
          >
            <Ionicons name="arrow-back" size={24} color="#1B4332" />
          </TouchableOpacity>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              marginRight: 10,
              backgroundColor: "#DBEAFE",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontWeight: "700", fontSize: 14, color: "#1E40AF" }}>
              {participantName
                .split(" ")
                .map((n: string) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: "#1B4332", fontWeight: "700", fontSize: 16 }}
              numberOfLines={1}
            >
              {participantName}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                marginTop: 1,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: online ? "#52B788" : "#B7E4C7",
                }}
              />
              <Text style={{ color: "#95D5B2", fontSize: 11 }}>
                {online ? "Online" : "Offline - messages queued"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleCall}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: participantPhone ? "#1B4332" : "#F0FAF4",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="call"
              size={20}
              color={participantPhone ? "#D8F3DC" : "#B7E4C7"}
            />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          {loading ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator color="#52B788" />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={items}
              keyExtractor={(i) => i.key}
              contentContainerStyle={{ paddingVertical: 12, paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollToBottom(false)}
              ListEmptyComponent={
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 80,
                  }}
                >
                  <Text
                    style={{
                      color: "#1B4332",
                      fontWeight: "700",
                      fontSize: 16,
                    }}
                  >
                    Say hello to {participantName.split(" ")[0]}!
                  </Text>
                  <Text
                    style={{
                      color: "#95D5B2",
                      fontSize: 13,
                      marginTop: 6,
                      textAlign: "center",
                      paddingHorizontal: 40,
                    }}
                  >
                    Messages save on your device.{"\n"}Auto-delete after 3 days.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                if (item.type === "divider")
                  return <DateDivider label={item.label} />;
                return (
                  <Bubble
                    msg={item.msg}
                    isMe={String(item.msg.senderId).trim() === userId}
                  />
                );
              }}
            />
          )}

          {/* Input bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 10,
              paddingHorizontal: 16,
              paddingVertical: 12,
              paddingBottom: Platform.OS === "ios" ? 16 : 12,
              backgroundColor: "#FFFFFF",
              borderTopWidth: 0.5,
              borderTopColor: "#D8F3DC",
            }}
          >
            <View
              style={{
                flex: 1,
                borderWidth: 1.5,
                borderColor: text ? "#52B788" : "#D8F3DC",
                borderRadius: 24,
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: "#F0FAF4",
                maxHeight: 120,
              }}
            >
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                placeholder="Type a message..."
                placeholderTextColor="#B7E4C7"
                multiline
                style={{
                  color: "#1B4332",
                  fontSize: 15,
                  lineHeight: 22,
                  padding: 0,
                  maxHeight: 100,
                }}
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
              />
            </View>
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim() || sending}
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor:
                  text.trim() && !sending ? "#1B4332" : "#D8F3DC",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#52B788" />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={text.trim() ? "#D8F3DC" : "#95D5B2"}
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}