
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useContext, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { AuthContext, useAuth } from "@/components/context/AuthContext";
import { chatService } from "@/components/services/chatService";

interface Props {
  farmerId:     string;
  farmerName:   string;
  farmerPhone?: string;
}

export default function MessageFarmerButton({ farmerId, farmerName, farmerPhone }: Props) {
  const router        = useRouter();
  const { user }      = useAuth()
  const [loading, setLoading] = useState(false);

  // Handles both user.id and user.user_id
  const userId = user?.id || (user as any)?.user_id || "";

  const handlePress = async () => {
    if (!userId) {
      console.warn("MessageFarmerButton: no userId found in AuthContext. user =", JSON.stringify(user));
      return;
    }

    setLoading(true);
    try {
      const convo = await chatService.getOrCreateConversation(userId, {
        participantId:    farmerId,
        participantName:  farmerName,
        participantRole:  "farmer",
        participantPhone: farmerPhone,
      });

      router.push({
        pathname: "/(tabs)/(customer-tabs)/chat/[id]",
        params: {
          id:               convo.id,
          participantName:  farmerName,
          participantId:    farmerId,
          participantRole:  "farmer",
          participantPhone: farmerPhone || "",
        },
      });
    } catch (error) {
      console.error("MessageFarmerButton error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={loading}
      style={{
        flex: 1, height: 64, borderRadius: 20,
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        backgroundColor: "#F0FAF4", borderWidth: 1.5, borderColor: "#D8F3DC", gap: 8,
      }}
    >
      {loading ? (
        <ActivityIndicator color="#1B4332" />
      ) : (
        <>
          <Ionicons name="chatbubble-outline" size={20} color="#1B4332" />
          <Text style={{ color: "#1B4332", fontWeight: "800", fontSize: 15 }}>
            Message {farmerName.split(" ")[0]}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
