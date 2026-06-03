import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/components/context/AuthContext";
import { chatService, Message } from "@/components/services/chatService";
import { chatSocket } from "@/components/services/chatSocket";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatMsgTime(iso: string): string {
  try {
    const d = new Date(iso);
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h > 12 ? h - 12 : h || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
  } catch { return ""; }
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function dayLabel(iso: string): string {
  const d   = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" });
}

// ── Date divider ──────────────────────────────────────────────────────────────
function DateDivider({ label }: { label: string }) {
  return (
    <View style={{ alignItems: "center", marginVertical: 12 }}>
      <View style={{ backgroundColor: "#D8F3DC", paddingHorizontal: 14, paddingVertical: 4, borderRadius: 99 }}>
        <Text style={{ color: "#1B4332", fontSize: 11, fontWeight: "600" }}>{label}</Text>
      </View>
    </View>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, isMe }: { msg: Message; isMe: boolean }) {
  return (
    <View style={{ alignItems: isMe ? "flex-end" : "flex-start", marginBottom: 4, paddingHorizontal: 12 }}>
      <View style={{
        maxWidth: "76%",
        backgroundColor:     isMe ? "#1B4332" : "#FFFFFF",
        borderRadius:        18,
        borderBottomRightRadius: isMe ? 4 : 18,
        borderBottomLeftRadius:  isMe ? 18 : 4,
        paddingHorizontal:   14,
        paddingVertical:     10,
        elevation:           1,
        shadowColor:         "#000",
        shadowOpacity:       0.06,
        shadowRadius:        3,
      }}>
        <Text style={{ color: isMe ? "#D8F3DC" : "#1B4332", fontSize: 15, lineHeight: 22 }}>
          {msg.text}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: isMe ? "flex-end" : "flex-start", marginTop: 4, gap: 4 }}>
          <Text style={{ color: isMe ? "#52B788" : "#95D5B2", fontSize: 10 }}>
            {formatMsgTime(msg.createdAt)}
          </Text>
          {isMe && (
            <Text style={{ fontSize: 10, color: msg.synced ? "#52B788" : msg.pending ? "#B7E4C7" : "#52B788" }}>
              {msg.pending ? "⏳" : msg.synced ? "✓✓" : "✓"}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ── List item type ────────────────────────────────────────────────────────────
type ListItem =
  | { type: "divider"; label: string; key: string }
  | { type: "bubble";  msg: Message;  key: string };

function buildItems(messages: Message[]): ListItem[] {
  const items: ListItem[] = [];
  let lastDay = "";
  for (const msg of messages) {
    if (!isSameDay(msg.createdAt, lastDay || msg.createdAt) || !lastDay) {
      items.push({ type: "divider", label: dayLabel(msg.createdAt), key: `div-${msg.createdAt}` });
      lastDay = msg.createdAt;
    }
    items.push({ type: "bubble", msg, key: msg.id });
  }
  return items;
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params  = useLocalSearchParams<{
    id:               string;
    participantName:  string;
    participantId:    string;
    participantRole:  string;
    participantPhone: string;
  }>();

  const convoId         = params.id;
  const participantName = params.participantName ?? "Chat";
  const participantPhone = params.participantPhone || "";

  const [messages,  setMessages]  = useState<Message[]>([]);
  const [text,      setText]      = useState("");
  const [loading,   setLoading]   = useState(true);
  const [online,    setOnline]    = useState(chatSocket.isConnected);
  const [sending,   setSending]   = useState(false);

  const listRef  = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // ── Load messages ───────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    const msgs = await chatService.getMessages(convoId);
    setMessages(msgs);
    setLoading(false);
    scrollToBottom(false);
  }, [convoId]);

  useEffect(() => {
    loadMessages();
    if (user?.id) chatService.markAsRead(convoId, user.id);

    // Connect socket if needed
    AsyncStorage.getItem("access_token").then(token => {
      if (token && user?.id) chatSocket.connect(token, user.id);
    });

    const unsubStatus = chatSocket.onStatus(setOnline);
    const unsubMsg    = chatSocket.onMessage(async (msg) => {
      if (msg.conversationId === convoId) {
        setMessages(prev => {
          // Replace pending with confirmed, or add new
          const exists = prev.some(m => m.id === msg.id || m.localId === msg.id);
          if (exists) {
            return prev.map(m =>
              (m.id === msg.id || m.localId === msg.id)
                ? { ...m, id: msg.id, pending: false, synced: true }
                : m
            );
          }
          return [...prev, msg];
        });
        scrollToBottom(true);
        if (user?.id) chatService.markAsRead(convoId, user.id);
      }
    });

    return () => { unsubStatus(); unsubMsg(); };
  }, [convoId, user?.id]);

  const scrollToBottom = (animated = true) => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 80);
  };

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !user?.id || sending) return;

    setText("");
    setSending(true);

    try {
      // 1. Save locally immediately (optimistic)
      const msg = await chatService.sendMessage({
        conversationId: convoId,
        senderId:       user.id,
        senderName:     user.full_name || "Me",
        receiverId:     params.participantId,
        text:           trimmed,
      });

      // Show it immediately in the list
      setMessages(prev => [...prev, msg]);
      scrollToBottom(true);

      // 2. Try to send via WebSocket
      const sent = chatSocket.send({
        localId:        msg.localId!,
        receiverId:     params.participantId,
        text:           trimmed,
        conversationId: convoId,
      });

      if (!sent) {
        // Offline — message is queued in AsyncStorage pending list
        // Will be flushed automatically when socket reconnects
      }
    } finally {
      setSending(false);
    }
  }, [text, user, convoId, params.participantId, sending]);

  // ── Call ────────────────────────────────────────────────────────────────────
  const handleCall = () => {
    if (!participantPhone) {
      Alert.alert(
        "No Phone Number",
        `${participantName} has not added a phone number to their profile.`
      );
      return;
    }
    Alert.alert(
      `Call ${participantName}`,
      participantPhone,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Call", onPress: () => Linking.openURL(`tel:${participantPhone}`) },
      ]
    );
  };

  const items = buildItems(messages);

  return (
    <View style={{ flex: 1, backgroundColor: "#F0FAF4" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={{
          flexDirection: "row", alignItems: "center",
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 0.5, borderBottomColor: "#D8F3DC",
          elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4,
        }}>
          {/* Back */}
          <TouchableOpacity onPress={() => router.back()}
            style={{ marginRight: 12, padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color="#1B4332" />
          </TouchableOpacity>

          {/* Avatar */}
          <View style={{
            width: 40, height: 40, borderRadius: 12, marginRight: 10,
            backgroundColor: params.participantRole === "farmer" ? "#D8F3DC" : "#DBEAFE",
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{
              fontWeight: "700", fontSize: 14,
              color: params.participantRole === "farmer" ? "#1B4332" : "#1E40AF",
            }}>
              {participantName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
            </Text>
          </View>

          {/* Name + status */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#1B4332", fontWeight: "700", fontSize: 16 }} numberOfLines={1}>
              {participantName}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 }}>
              <View style={{
                width: 6, height: 6, borderRadius: 3,
                backgroundColor: online ? "#52B788" : "#B7E4C7",
              }}/>
              <Text style={{ color: "#95D5B2", fontSize: 11 }}>
                {online ? "Online" : "Offline — messages queued"}
              </Text>
            </View>
          </View>

          {/* Call button */}
          <TouchableOpacity onPress={handleCall}
            style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: participantPhone ? "#1B4332" : "#F0FAF4",
              alignItems: "center", justifyContent: "center",
            }}>
            <Ionicons
              name="call"
              size={20}
              color={participantPhone ? "#D8F3DC" : "#B7E4C7"}
            />
          </TouchableOpacity>
        </View>

        {/* ── Messages ───────────────────────────────────────────────────── */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color="#52B788" />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={items}
              keyExtractor={item => item.key}
              contentContainerStyle={{ paddingVertical: 12, paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollToBottom(false)}
              ListEmptyComponent={
                <View style={{ alignItems: "center", justifyContent: "center", marginTop: 80 }}>
                  <Text style={{ fontSize: 36, marginBottom: 12 }}>👋</Text>
                  <Text style={{ color: "#1B4332", fontWeight: "700", fontSize: 16 }}>
                    Say hello to {participantName.split(" ")[0]}!
                  </Text>
                  <Text style={{ color: "#95D5B2", fontSize: 13, marginTop: 6, textAlign: "center", paddingHorizontal: 40 }}>
                    Messages are saved on your device.{"\n"}They auto-delete after 3 days.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                if (item.type === "divider") return <DateDivider label={item.label} />;
                return <Bubble msg={item.msg} isMe={item.msg.senderId === user?.id} />;
              }}
            />
          )}

          {/* ── Input bar ──────────────────────────────────────────────── */}
          <View style={{
            flexDirection: "row", alignItems: "flex-end", gap: 10,
            paddingHorizontal: 16, paddingVertical: 12,
            paddingBottom: Platform.OS === "ios" ? 16 : 12,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 0.5, borderTopColor: "#D8F3DC",
          }}>
            <View style={{
              flex: 1,
              borderWidth: 1.5,
              borderColor: text ? "#52B788" : "#D8F3DC",
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: "#F0FAF4",
              maxHeight: 120,
            }}>
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                placeholder="Type a message…"
                placeholderTextColor="#B7E4C7"
                multiline
                style={{ color: "#1B4332", fontSize: 15, lineHeight: 22, padding: 0, maxHeight: 100 }}
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
              />
            </View>

            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim() || sending}
              style={{
                width: 46, height: 46, borderRadius: 23,
                backgroundColor: text.trim() && !sending ? "#1B4332" : "#D8F3DC",
                alignItems: "center", justifyContent: "center",
              }}
            >
              {sending
                ? <ActivityIndicator size="small" color="#52B788" />
                : <Ionicons name="send" size={20} color={text.trim() ? "#D8F3DC" : "#95D5B2"} />
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

      </SafeAreaView>
    </View>
  );
}
