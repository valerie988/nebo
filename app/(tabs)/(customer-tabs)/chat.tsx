import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { chatService, Conversation } from "@/components/services/chatService";
import { chatSocket } from "@/components/services/chatSocket";
import { useAuth } from "@/components/context/AuthContext";

// --- Helper Functions ---

function formatTime(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short" });
}

function expiryLabel(lastAt: string, createdAt: string): string {
  const ref = lastAt || createdAt;
  const left = 3 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(ref).getTime());
  if (left <= 0) return "Expiring…";
  const hrs = Math.floor(left / 3600000);
  return hrs < 24 ? `Expires in ${hrs}h` : `Expires in ${Math.floor(hrs / 24)}d`;
}

// --- Sub-Components ---

function Avatar({ name, role }: { name: string; role: string }) {
  const initials = (name || "?").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <View style={{
      width: 52, height: 52, borderRadius: 16, marginRight: 12,
      backgroundColor: role === "farmer" ? "#D8F3DC" : "#DBEAFE",
      alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: role === "farmer" ? "#1B4332" : "#1E40AF", fontWeight: "700", fontSize: 16 }}>
        {initials}
      </Text>
    </View>
  );
}

function ConvoRow({ item, currentUserRole, onPress, onLongPress }: {
  item: Conversation;
  currentUserRole?: "farmer" | "customer";
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress} onLongPress={onLongPress} activeOpacity={0.75}
      style={{
        flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 20,
        paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8, marginHorizontal: 16,
        elevation: 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4,
      }}
    >
      <Avatar name={item.participantName} role={item.participantRole} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#1B4332", fontWeight: "700", fontSize: 14, flex: 1 }} numberOfLines={1}>
            {item.participantName}
          </Text>
          <Text style={{ color: "#95D5B2", fontSize: 11 }}>{formatTime(item.lastMessageAt)}</Text>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
          <Text style={{ color: "#95D5B2", fontSize: 12, flex: 1, marginRight: 8 }} numberOfLines={1}>
            {item.lastMessage || "No messages yet"}
          </Text>
          {(item.unreadCount || 0) > 0 && (
            <View style={{ backgroundColor: "#1B4332", borderRadius: 99, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }}>
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{item.unreadCount}</Text>
            </View>
          )}
        </View>

        {/* Conditional Badge: Only show role if current user is a Farmer */}
        {currentUserRole === "farmer" && (
          <View style={{ marginTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: "#DBEAFE" }}>
              <Text style={{ fontSize: 10, fontWeight: "600", color: "#1E40AF" }}>{item.participantRole}</Text>
            </View>
            <Text style={{ fontSize: 9, color: "#B7E4C7" }}>{expiryLabel(item.lastMessageAt, item.createdAt)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// --- Main Screen ---

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [online, setOnline] = useState(false);

  const load = useCallback(async () => {
    setConvos(await chatService.getConversations());
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!user?.id) return;
    AsyncStorage.getItem("access_token").then(token => {
      if (token) chatSocket.connect(token, user.id);
    });
    const u1 = chatSocket.onStatus(setOnline);
    const u2 = chatSocket.onMessage(() => load());
    return () => { u1(); u2(); };
  }, [user?.id]);

  // Filter logic: Farmers see customers, Customers see farmers
  const displayedConvos = convos.filter((c) => {
    if (user?.role === "farmer") return c.participantRole === "customer";
    if (user?.role === "customer") return c.participantRole === "farmer";
    return true;
  });

  const confirmDelete = (c: Conversation) =>
    Alert.alert("Delete Chat", `Delete chat with ${c.participantName}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await chatService.deleteConversation(c.id);
        setConvos(p => p.filter(x => x.id !== c.id));
      }},
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F0FAF4" }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ padding: 20, flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: "#1B4332", fontSize: 30, fontWeight: "900" }}>Messages</Text>
            <Text style={{ color: "#52B788" }}>{displayedConvos.length} conversation{displayedConvos.length !== 1 ? "s" : ""}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: online ? "#52B788" : "#B7E4C7" }} />
            <Text style={{ color: "#95D5B2", fontSize: 10 }}>{online ? "Online" : "Offline"}</Text>
          </View>
        </View>

        <FlatList
          data={displayedConvos}
          keyExtractor={c => c.id}
          renderItem={({ item }) => (
            <ConvoRow
              item={item}
              currentUserRole={user?.role}
              onLongPress={() => confirmDelete(item)}
              onPress={() => router.push({
                pathname: "/chat/[id]",
                params: {
                  id: item.id,
                  participantName: item.participantName,
                  participantId: item.participantId,
                  participantRole: item.participantRole,
                  participantPhone: item.participantPhone || "",
                },
              })}
            />
          )}
        />
      </SafeAreaView>
    </View>
  );
}