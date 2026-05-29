import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {  useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/components/context/AuthContext";
import { chatService, Conversation } from "@/components/services/chatService";

// ─── Format timestamp 
function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en", { day: "numeric", month: "short" });
}

function Avatar({ name, role }: { name: string; role: "farmer" | "customer" }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View
      className="rounded-2xl items-center justify-center mr-3"
      style={{
        width: 52,
        height: 52,
        backgroundColor: role === "farmer" ? "#D8F3DC" : "#DBEAFE",
      }}
    >
      <Text
        className="font-bold text-base"
        style={{ color: role === "farmer" ? "#1B4332" : "#1E40AF" }}
      >
        {initials}
      </Text>
    </View>
  );
}

// ─── Conversation Row ─────────────────────────────────────────────────────────
function ConvoRow({ item, onPress }: { item: Conversation; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="flex-row items-center bg-white rounded-2xl px-4 py-3 mb-2"
    >
      <Avatar name={item.participantName} role={item.participantRole} />

      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-[#1B4332] font-bold text-sm" numberOfLines={1}>
            {item.participantName}
          </Text>
          <Text className="text-[#95D5B2] text-xs">
            {item.lastMessageAt ? formatTime(item.lastMessageAt) : ""}
          </Text>
        </View>

        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-[#95D5B2] text-xs flex-1 mr-2" numberOfLines={1}>
            {item.lastMessage || "No messages yet"}
          </Text>
          {item.unreadCount > 0 && (
            <View className="bg-[#1B4332] rounded-full px-2 py-0.5 min-w-5 items-center">
              <Text className="text-white text-xs font-bold">{item.unreadCount}</Text>
            </View>
          )}
        </View>

        {/* Role tag */}
        <View
          className="self-start rounded-full px-2 py-0.5 mt-1.5"
          style={{ backgroundColor: item.participantRole === "farmer" ? "#D8F3DC" : "#DBEAFE" }}
        >
          <Text
            className="text-xs font-semibold capitalize"
            style={{ color: item.participantRole === "farmer" ? "#1B4332" : "#1E40AF" }}
          >
            {item.participantRole === "farmer" ? "🌱 Farmer" : "🛍️ Customer"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Chat List Screen ─────────────────────────────────────────────────────────
export default function ChatScreen() {
  const router = useRouter();
  const { role } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");

  const loadConversations = async () => {
    const convos = await chatService.getConversations();
    setConversations(convos.sort((a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    ));
  };

  // Reload every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadConversations();
      chatService.syncPending(); // try to sync offline messages
    }, [])
  );

  const filtered = conversations.filter((c) =>
    c.participantName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View className="flex-1 bg-[#F0FAF4]">
      <SafeAreaView className="flex-1">

        {/* Header */}
        <View className="px-5 pt-5 pb-4">
          <Text className="text-[#1B4332] text-3xl font-black" style={{ letterSpacing: -1 }}>
            Messages
          </Text>
          <Text className="text-[#52B788] text-sm mt-1">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-white rounded-2xl mx-5 px-4 mb-4" style={{ height: 46 }}>
          <Text className="text-base mr-2">🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search conversations…"
            placeholderTextColor="#B7E4C7"
            className="flex-1 text-[#1B4332] text-sm"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text className="text-[#95D5B2] text-lg">×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        {filtered.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-5xl mb-3">💬</Text>
            <Text className="text-[#1B4332] font-bold text-base">
              {search ? "No results" : "No conversations yet"}
            </Text>
            <Text className="text-[#95D5B2] text-sm mt-1 text-center px-10">
              {search
                ? "Try a different name"
                : `Start a chat from a ${role === "farmer" ? "customer's" : "farmer's"} profile`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <ConvoRow
                item={item}
                onPress={() => {
                  chatService.markAsRead(item.id);
                  router.push({
                    pathname: "/chat/[id]",
                    params: {
                      id: item.id,
                      name: item.participantName,
                      role: item.participantRole,
                      participantId: item.participantId,
                    },
                  });
                }}
              />
            )}
          />
        )}

      </SafeAreaView>
    </View>
  );
}