import { useAuth } from "@/components/context/AuthContext";
import { chatService } from "@/components/services/chatService";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity } from "react-native";

interface Props {
  farmerId: string;
  farmerName: string;
  farmerPhone?: string;
  variant?: "button" | "icon";
}

export default function MessageFarmerButton({
  farmerId,
  farmerName,
  farmerPhone,
}: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    try {
      let userId = user?.id || user?.user_id || user?._id || user?.userId;

      console.log("AuthContext User:", user);

      // Fallback to AsyncStorage
      if (!userId) {
        const storedUser = await AsyncStorage.getItem("nebo_user");

        console.log("Stored User:", storedUser);

        if (storedUser) {
          const parsed = JSON.parse(storedUser);

          userId =
            parsed?.id || parsed?.user_id || parsed?._id || parsed?.userId;
        }
      }

      if (!userId) {
        console.log("No user ID found");
        Alert.alert(
          "Authentication Error",
          "Unable to identify current user. Please log in again.",
        );
        return;
      }

      console.log("Current User ID:", userId);

      setLoading(true);

      const convo = await chatService.getOrCreateConversation({
        participantId: farmerId,
        participantName: farmerName,
        participantRole: "farmer",
        participantPhone: farmerPhone,
      });

      console.log("Conversation:", convo);

      router.push({
        pathname: "/(tabs)/(customer-tabs)/chat/[id]",
        params: {
          id: convo.id,
          participantName: farmerName,
          participantId: farmerId,
          participantRole: "farmer",
          participantPhone: farmerPhone || "",
        },
      });
    } catch (error: any) {
      console.error("Chat Error:", error);

      Alert.alert("Chat Error", error?.message || "Failed to open chat.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={loading}
      style={{
        flex: 1,
        height: 49,
        borderRadius: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F0FAF4",
        borderWidth: 1.5,
        borderColor: "#D8F3DC",
        gap: 8,
      }}
    >
      {loading ? (
        <ActivityIndicator color="#1B4332" />
      ) : (
        <>
         
          <Text
            style={{
              color: "#1B4332",
              fontWeight: "800",
              fontSize: 15,
            }}
          >
            Message farmer
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
