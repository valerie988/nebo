import { useAuth } from "@/components/context/AuthContext";
import { chatService, Conversation } from "@/components/services/chatService";
import { chatSocket } from "@/components/services/chatSocket";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


function formatTime(iso: string): string {
  if (!iso) return "";
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "now";
  if (mins  < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days  <  7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short" });
}

function expiryLabel(lastAt: string, createdAt: string): string {
  const ref  = lastAt || createdAt;
  const left = 3 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(ref).getTime());
  if (left <= 0) return "Expiring…";
  const hrs = Math.floor(left / 3600000);
  return hrs < 24 ? `Expires in ${hrs}h` : `Expires in ${Math.floor(hrs / 24)}d`;
}

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

function ConvoRow({ item, onPress, onLongPress }: {
  item: Conversation; onPress: () => void; onLongPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress} onLongPress={onLongPress} activeOpacity={0.75}
      style={{
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#fff", borderRadius: 20,
        paddingHorizontal: 16, paddingVertical: 12,
        marginBottom: 8, marginHorizontal: 16,
        elevation: 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4,
      }}
    >
      <Avatar name={item.participantName} role={item.participantRole} />
      <View style={{ flex: 1 }}>
        {/* Row 1: name + time */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#1B4332", fontWeight: "700", fontSize: 14, flex: 1, marginRight: 8 }}
            numberOfLines={1}>{item.participantName}</Text>
          <Text style={{ color: "#95D5B2", fontSize: 11 }}>{formatTime(item.lastMessageAt)}</Text>
        </View>
        {/* Row 2: last message + unread */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
          <Text style={{ color: "#95D5B2", fontSize: 12, flex: 1, marginRight: 8 }} numberOfLines={1}>
            {item.lastMessage || "No messages yet"}
          </Text>
          {(item.unreadCount || 0) > 0 && (
            <View style={{
              backgroundColor: "#1B4332", borderRadius: 99,
              minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
            }}>
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
        {/* Row 3: role badge + expiry */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <View style={{
            paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99,
            backgroundColor: item.participantRole === "farmer" ? "#D8F3DC" : "#DBEAFE",
          }}>
            <Text style={{ fontSize: 10, fontWeight: "600",
              color: item.participantRole === "farmer" ? "#1B4332" : "#1E40AF" }}>
              {item.participantRole === "farmer" ? "Farmer" : "Customer"}
            </Text>
          </View>
          <Text style={{ fontSize: 9, color: "#B7E4C7" }}>
            {expiryLabel(item.lastMessageAt, item.createdAt)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatListScreen() {
  const router               = useRouter();
  const { user } = useAuth();
  const [convos, setConvos]  = useState<Conversation[]>([]);
  const [online, setOnline]  = useState(false);

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

  const confirmDelete = (c: Conversation) =>
    Alert.alert("Delete Chat", `Delete chat with ${c.participantName}?\nChats also auto-delete after 3 days.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await chatService.deleteConversation(c.id);
        setConvos(p => p.filter(x => x.id !== c.id));
      }},
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F0FAF4" }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
          flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: "#1B4332", fontSize: 30, fontWeight: "900", letterSpacing: -1 }}>Messages</Text>
            <Text style={{ color: "#52B788", fontSize: 14, marginTop: 2 }}>
              {convos.length} conversation{convos.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4,
              backgroundColor: online ? "#52B788" : "#B7E4C7" }} />
            <Text style={{ color: "#95D5B2", fontSize: 10 }}>{online ? "Online" : "Offline"}</Text>
          </View>
        </View>

        {convos.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>💬</Text>
            <Text style={{ color: "#1B4332", fontWeight: "700", fontSize: 18, textAlign: "center" }}>
              No conversations yet
            </Text>
            <Text style={{ color: "#95D5B2", fontSize: 14, marginTop: 8, textAlign: "center" }}>
              {user?.role === "customer"
                ? "Tap 'Message Farmer' on any product to start chatting"
                : "Customers will message you from your product listings"}
            </Text>
            <Text style={{ color: "#B7E4C7", fontSize: 11, marginTop: 12, textAlign: "center" }}>
              ⏱ Chats auto-delete after 3 days
            </Text>
          </View>
        ) : (
          <FlatList
            data={convos} keyExtractor={c => c.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 32 }}
            renderItem={({ item }) => (
              <ConvoRow
                item={item}
                onLongPress={() => confirmDelete(item)}
                onPress={() => router.push({
                  pathname: "/chat/[id]",
                  params: {
                    id:               item.id,
                    participantName:  item.participantName,
                    participantId:    item.participantId,
                    participantRole:  item.participantRole,
                    participantPhone: item.participantPhone || "",
                  },
                })}
              />
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
