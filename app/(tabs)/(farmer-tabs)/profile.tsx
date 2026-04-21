import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/components/context/AuthContext";
import { useState, useEffect} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "http://172.20.10.2:8000"; 

// --- Components ---
function QuickLink({ emoji, label, subtitle, onPress, accent }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{ backgroundColor: accent }}
      className="flex-1 rounded-[24px] p-5 mx-[6px] shadow-sm"
    >
      <Text className="text-[30px] mb-2">{emoji}</Text>
      <Text className="text-white font-black text-[14px]">{label}</Text>
      <Text className="text-white/60 text-[10px] mt-0.5">{subtitle}</Text>
    </TouchableOpacity>
  );
}

function MenuRow({ emoji, label, subtitle, onPress, danger = false, rightText }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center py-4 border-b border-[#F0FAF4]"
    >
      <View className={`w-10 h-10 rounded-2xl items-center justify-center mr-4 ${danger ? "bg-red-50" : "bg-[#F0FAF4]"}`}>
        <Text className="text-lg">{emoji}</Text>
      </View>
      <View className="flex-1">
        <Text className={`text-[15px] font-bold ${danger ? "text-red-600" : "text-[#1B4332]"}`}>{label}</Text>
        {subtitle && <Text className="text-[11px] text-[#95D5B2] mt-0.5">{subtitle}</Text>}
      </View>
      {rightText && <Text className="text-[#52B788] text-xs font-bold mr-2">{rightText}</Text>}
      <Ionicons name="chevron-forward" size={16} color={danger ? "#FCA5A5" : "#D8F3DC"} />
    </TouchableOpacity>
  );
}

export default function FarmerProfileScreen() {
  const { logout } = useAuth();
  const router = useRouter();
  const [farmer, setFarmer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("nebo_token");
      if (!token) return;

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setFarmer(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleEdit = () => {
    router.push({
      pathname: "/farmer/edit-profile",
      params: { name: farmer?.full_name, loc: farmer?.location }
    });
  };

  if (loading) return <ActivityIndicator className="flex-1" color="#1B4332" />;

  return (
    <View className="flex-1 bg-[#F0FAF4]">
      <SafeAreaView className="flex-1">
        <ScrollView 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchProfile} />}
        >
          {/* Header with Notification Bell */}
          <View className="px-6 pt-6 pb-4 flex-row justify-between items-end">
            <Text className="text-[#1B4332] text-[36px] font-black tracking-tighter">Profile</Text>
            <TouchableOpacity 
              onPress={() => router.push("/notifications")} 
              className="w-12 h-12 bg-white rounded-2xl items-center justify-center border border-[#D8F3DC]"
            >
              <Ionicons name="notifications-outline" size={24} color="#1B4332" />
              <View className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            </TouchableOpacity>
          </View>

          {/* Hero Card */}
          <View className="mx-6 bg-[#1B4332] rounded-[32px] p-6 mb-5 shadow-xl">
            <View className="flex-row items-center mb-6">
              <View className="w-[75px] h-[75px] rounded-[24px] bg-[#2D6A4F] items-center justify-center mr-4">
                <Text className="text-[40px]">👨‍🌾</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-black text-xl">{farmer?.full_name || "Farmer"}</Text>
                <Text className="text-[#95D5B2] text-xs">{farmer?.email}</Text>
              </View>
              <TouchableOpacity onPress={handleEdit}>
                <Ionicons name="create-outline" size={22} color="white" />
              </TouchableOpacity>
            </View>

            <View className="flex-row bg-[#2D6A4F] rounded-[22px] py-4">
              <View className="flex-1 items-center border-r border-[#1B4332]">
                <Text className="text-white font-black text-lg">{farmer?.total_products || "0"}</Text>
                <Text className="text-[#95D5B2] text-[9px] uppercase font-black">Products</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-white font-black text-lg">{farmer?.location?.split(',')[0] || "Buea"}</Text>
                <Text className="text-[#95D5B2] text-[9px] uppercase font-black">Location</Text>
              </View>
            </View>
          </View>

          {/* Quick Links */}
          <View className="px-6 flex-row mb-6">
            <QuickLink emoji="🌾" label="My Store" subtitle="Manage stock" accent="#2D6A4F" onPress={() => router.push("/(tabs)/(farmer-tabs)/marketplace")} />
            <QuickLink emoji="➕" label="Dashboard" subtitle="Harvest Insights" accent="#1B4332" onPress={() => router.push("/farmer/dashboard")} />
          </View>

          {/* Menu */}
          <View className="px-6">
            <View className="bg-white rounded-[28px] px-5 py-2 border border-[#D8F3DC]">
              <MenuRow emoji="👤" label="Edit Profile" subtitle="Name, Location, Bio" onPress={handleEdit} />
              <MenuRow emoji="🛡️" label="Security" subtitle="Password & Privacy" onPress={() => {}} />
              <MenuRow emoji="🚪" label="Sign Out" onPress={() => logout()} danger />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}