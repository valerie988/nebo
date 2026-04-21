import { useAuth } from "@/components/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// --- Configuration ---
const API_URL = "http://172.20.10.2:8000";

export default function CustomerProfileScreen() {
  const { logout } = useAuth();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

const fetchProfile = async () => {
  console.log("Profile Fetch Started...");
  try {
    const token = await AsyncStorage.getItem("nebo_token");
    
    // Explicitly using the IP string to avoid variable issues
    const response = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("SUCCESS! Backend said:", data);
    setUser(data);
  } catch (err: any) {
    console.error("NETWORK ERROR:", err.message);
    // This alert helps you debug on the physical screen
    Alert.alert("Network Failed", `Tried: ${API_URL}/auth/me. Check your IP!`);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchProfile();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#F0FAF4] items-center justify-center">
        <ActivityIndicator size="large" color="#1B4332" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F0FAF4]">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1B4332"
            />
          }
        >
          {/* Header */}
          <View className="flex-row justify-between items-center px-6 pt-6 pb-4">
            <Text className="text-[#1B4332] text-[36px] font-black tracking-tighter">
              NeBo
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/notifications")}
              className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm border border-[#D8F3DC]"
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#1B4332"
              />
              {/* Notification Dot */}
              <View className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
            </TouchableOpacity>
          </View>

          {/* Customer Hero Card */}
          <View className="mx-6 bg-[#1B4332] rounded-[32px] p-6 mb-5 shadow-xl">
            <View className="flex-row items-center mb-6">
              <View className="w-[70px] h-[70px] rounded-full bg-[#2D6A4F] items-center justify-center mr-4 border-2 border-[#52B788]">
                <Text className="text-[35px]">👤</Text>
              </View>
              <View className="flex-1">
                <Text
                  className="text-white font-black text-xl"
                  numberOfLines={1}
                >
                  {user?.full_name || "Customer"}
                </Text>
                <Text className="text-[#95D5B2] text-xs font-semibold">
                  {user?.email}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/profile/edit")}
                  className="self-start bg-[#40916C] rounded-full px-4 py-1.5 mt-2 flex-row items-center"
                >
                  <Ionicons name="pencil" size={10} color="white" />
                  <Text className="text-white text-[10px] font-black uppercase tracking-widest ml-1">
                    Edit Profile
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Hero Card Stats Bar */}
            <View className="flex-row bg-[#2D6A4F] rounded-[22px] py-4 px-2">
              <View className="flex-1 items-center border-r border-[#1B4332]">
                <Text className="text-white font-black text-lg">
                  {user?.total_orders ?? "0"}
                </Text>
                <Text className="text-[#95D5B2] text-[9px] font-black uppercase">
                  Orders Placed
                </Text>
              </View>

              <View className="flex-1 items-center">
                <Text
                  className="text-white font-black text-lg"
                  numberOfLines={1}
                >
                  {user?.location?.split(",")[0] || "No Address"}
                </Text>
                <Text className="text-[#95D5B2] text-[9px] font-black uppercase">
                  Location
                </Text>
              </View>
            </View>
          </View>

          {/* Core Customer Links */}
          <View className="px-6 mb-6">
            <TouchableOpacity
              onPress={() => router.push("/orders")}
              activeOpacity={0.8}
              className="bg-[#2D6A4F] rounded-[24px] p-6 shadow-sm flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="bg-[#40916C] p-3 rounded-2xl mr-4">
                  <Ionicons name="receipt-outline" size={28} color="white" />
                </View>
                <View>
                  <Text className="text-white font-black text-lg">
                    My Orders
                  </Text>
                  <Text className="text-white/60 text-xs">
                    View history & tracking
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Menu Sections */}
          <View className="px-6">
            <Section title="Settings">
              <MenuRow
                emoji="👤"
                label="Account Settings"
                subtitle="Change password & email"
                onPress={() => router.push("/(tabs)/profile/edit")}
              />
              <MenuRow
                emoji="📍"
                label="Address"
                subtitle={user?.location || "No address saved"}
                onPress={() => router.push("/(tabs)/profile/edit")}
              />
              <MenuRow
                emoji="🔔"
                label="Notifications"
                subtitle="Alerts & messaging"
                onPress={() => router.push("/notifications")}
              />
            </Section>

            <Section title="Support">
              <MenuRow
                emoji="🎧"
                label="Help & Support"
                subtitle="Get help with your orders"
                onPress={() => {}}
              />
              <MenuRow
                emoji="🛡️"
                label="Privacy & Security"
                onPress={() => {}}
              />
            </Section>

            <Section>
              <MenuRow
                emoji="🚪"
                label="Sign Out"
                onPress={handleLogout}
                danger
              />
            </Section>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// --- Helper UI Components ---
function MenuRow({ emoji, label, subtitle, onPress, danger = false }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center py-4 border-b border-[#F0FAF4]"
    >
      <View
        className={`w-10 h-10 rounded-2xl items-center justify-center mr-4 ${danger ? "bg-red-50" : "bg-[#F0FAF4]"}`}
      >
        <Text className="text-lg">{emoji}</Text>
      </View>
      <View className="flex-1">
        <Text
          className={`text-[15px] font-bold ${danger ? "text-red-600" : "text-[#1B4332]"}`}
        >
          {label}
        </Text>
        {subtitle && (
          <Text className="text-[11px] text-[#95D5B2] mt-0.5">{subtitle}</Text>
        )}
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={danger ? "#FCA5A5" : "#D8F3DC"}
      />
    </TouchableOpacity>
  );
}

function Section({ title, children }: any) {
  return (
    <View className="bg-white rounded-[28px] px-5 mb-4 shadow-sm border border-[#D8F3DC]">
      {title && (
        <Text className="text-[#95D5B2] text-[10px] font-black uppercase tracking-[2px] pt-5 pb-1">
          {title}
        </Text>
      )}
      {children}
      <View className="h-2" />
    </View>
  );
}
