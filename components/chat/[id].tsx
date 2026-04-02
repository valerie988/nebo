import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { chatService, Message } from "@/components/services/chatService";
import { useAuth } from "@/components/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Format message time ──────────────────────────────────────────────────────
function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "short" });
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function Bubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <View
      className={`mb-1 max-w-[78%] ${isMine ? "self-end items-end" : "self-start items-start"}`}
    >
      <View
        className={`rounded-2xl px-4 py-2.5 ${
          isMine
            ? "bg-[#1B4332] rounded-br-sm"
            : "bg-white rounded-bl-sm"
        }`}
      >
        <Text
          className={`text-sm leading-5 ${isMine ? "text-white" : "text-[#1B4332]"}`}
        >
          {msg.text}
        </Text>
      </View>

      {/* Time + sync status */}
      <View className="flex-row items-center mt-0.5 gap-1">
        <Text className="text-[#95D5B2] text-xs">{formatMsgTime(msg.createdAt)}</Text>
        {isMine && (
          <Text className="text-xs" style={{ color: msg.synced ? "#52B788" : "#95D5B2" }}>
            {msg.synced ? "✓✓" : "✓"}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Day separator ────────────────────────────────────────────────────────────
function DaySeparator({ label }: { label: string }) {
  return (
    <View className="flex-row items-center my-4 px-4">
      <View className="flex-1 h-px bg-[#D8F3DC]" />
      <Text className="text-[#95D5B2] text-xs mx-3 font-medium">{label}</Text>
      <View className="flex-1 h-px bg-[#D8F3DC]" />
    </View>
  );
}

// ─── Chat Screen ──────────────────────────────────────────────────────────────
export default function ChatConversation() {
  const { id, name, role: participantRole, participantId } = useLocalSearchParams<{
    id: string;
    name: string;
    role: "farmer" | "customer";
    participantId: string;
  }>();
  const router = useRouter();
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    // Get current user id from storage
    AsyncStorage.getItem("nebo_user_id").then((uid) => {
      if (uid) setCurrentUserId(uid);
    });
    loadMessages();
  }, []);

  const loadMessages = async () => {
    const msgs = await chatService.getMessages(id);
    setMessages(msgs);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const msg = await chatService.sendMessage(id, currentUserId, participantId, text);
    setMessages((prev) => [...prev, msg]);
    setText("");
    setSending(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  // Group messages by day
  type ListItem = { type: "day"; label: string; key: string } | { type: "msg"; msg: Message };
  const listItems: ListItem[] = [];
  let lastDay = "";
  for (const msg of messages) {
    const day = new Date(msg.createdAt).toDateString();
    if (day !== lastDay) {
      listItems.push({ type: "day", label: formatDayLabel(msg.createdAt), key: day });
      lastDay = day;
    }
    listItems.push({ type: "msg", msg });
  }

  return (
    <View className="flex-1 bg-[#F0FAF4]">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >

          {/* Header */}
          <View className="flex-row items-center bg-white px-4 py-3 border-b border-[#F0FAF4]">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
              <Text className="text-[#1B4332] text-xl font-bold">‹</Text>
            </TouchableOpacity>

            {/* Avatar */}
            <View
              className="rounded-2xl items-center justify-center mr-3"
              style={{
                width: 42,
                height: 42,
                backgroundColor: participantRole === "farmer" ? "#D8F3DC" : "#DBEAFE",
              }}
            >
              <Text className="font-bold text-sm" style={{ color: participantRole === "farmer" ? "#1B4332" : "#1E40AF" }}>
                {name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-[#1B4332] font-bold text-base">{name}</Text>
              <Text className="text-[#95D5B2] text-xs capitalize">
                {participantRole === "farmer" ? "🌱 Farmer" : "🛍️ Customer"}
              </Text>
            </View>
          </View>

          {/* Messages */}
          <FlatList
            ref={listRef}
            data={listItems}
            keyExtractor={(item, i) =>
              item.type === "day" ? item.key : item.msg.id
            }
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              if (item.type === "day") return <DaySeparator label={item.label} />;
              const isMine = item.msg.senderId === currentUserId;
              return <Bubble msg={item.msg} isMine={isMine} />;
            }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <Text className="text-4xl mb-3">👋</Text>
                <Text className="text-[#1B4332] font-semibold text-base">Say hello!</Text>
                <Text className="text-[#95D5B2] text-sm mt-1">Start the conversation</Text>
              </View>
            }
          />

          {/* Input bar */}
          <View className="flex-row items-end bg-white px-4 py-3 border-t border-[#F0FAF4]" style={{ gap: 10 }}>
            <View className="flex-1 bg-[#F0FAF4] rounded-2xl px-4 py-2.5 min-h-[44px] justify-center">
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Message…"
                placeholderTextColor="#B7E4C7"
                className="text-[#1B4332] text-sm"
                multiline
                maxLength={1000}
                style={{ maxHeight: 120 }}
              />
            </View>

            {/* Send button */}
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim() || sending}
              activeOpacity={0.8}
              className="rounded-2xl items-center justify-center"
              style={{
                width: 44,
                height: 44,
                backgroundColor: text.trim() ? "#1B4332" : "#D8F3DC",
              }}
            >
              <Text className="text-white text-lg">↑</Text>
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}