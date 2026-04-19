import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/components/context/AuthContext";
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

// --- Configuration ---
const API_URL = "http://172.20.10.1:8000"; 

// --- Helper Components ---
function QuickLink({ emoji, label, subtitle, onPress, accent = "#1B4332" }: any) {
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

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
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

// --- Main Screen ---
export default function FarmerProfileScreen() {
  const { logout } = useAuth();
  const router = useRouter();

  const [farmer, setFarmer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async () => {
    try {
      // 1. Get token (Ensuring key matches LoginScreen)
      const token = await AsyncStorage.getItem("userToken") || await AsyncStorage.getItem("token");
      
      if (!token) {
        setLoading(false);
        return;
      }

      // 2. API Call
      const response = await fetch(`${API_URL}/auth/me`, {
        method: "GET",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        setFarmer(data); // This uses your UserOut fields: full_name, email, role, etc.
      } else {
        console.error("Backend Error:", data.detail);
      }
    } catch (err) {
      console.error("Network Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    Alert.alert("Log Out", "Are you sure you want to exit NeBo?", [
      { text: "Stay", style: "cancel" },
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
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B4332" />
          }
        >
          {/* Header */}
          <View className="px-6 pt-6 pb-4">
            <Text className="text-[#1B4332] text-[36px] font-black tracking-tighter">
              Profile
            </Text>
          </View>

          {/* Hero Card - Dynamic Data Mapping */}
          <View className="mx-6 bg-[#1B4332] rounded-[32px] p-6 mb-5 shadow-xl">
            <View className="flex-row items-center mb-6">
              <View className="w-[75px] h-[75px] rounded-[24px] bg-[#2D6A4F] items-center justify-center mr-4">
                <Text className="text-[40px]">👨‍🌾</Text>
              </View>
              <View className="flex-1">
                {/* MATCHING Pydantic full_name */}
                <Text className="text-white font-black text-xl" numberOfLines={1}>
                  {farmer?.full_name || "NeBo Farmer"}
                </Text>
                {/* MATCHING Pydantic email */}
                <Text className="text-[#95D5B2] text-xs font-semibold">{farmer?.email}</Text>
                <View className="self-start bg-[#40916C] rounded-full px-3 py-1 mt-2">
                  <Text className="text-white text-[9px] font-black uppercase tracking-widest">
                    🌱 {farmer?.role || "Farmer"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Stats Bar */}
            <View className="flex-row bg-[#2D6A4F] rounded-[22px] py-4">
              <View className="flex-1 items-center border-r border-[#1B4332]">
                <Text className="text-white font-black text-lg">{farmer?.total_products || "0"}</Text>
                <Text className="text-[#95D5B2] text-[9px] font-black uppercase">Items</Text>
              </View>
              <View className="flex-1 items-center border-r border-[#1B4332]">
                <Text className="text-white font-black text-lg">{farmer?.total_orders || "0"}</Text>
                <Text className="text-[#95D5B2] text-[9px] font-black uppercase">Orders</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-white font-black text-lg" numberOfLines={1}>
                  {farmer?.location?.split(',')[0] || "Buea"}
                </Text>
                <Text className="text-[#95D5B2] text-[9px] font-black uppercase">Region</Text>
              </View>
            </View>
          </View>

          {/* Quick Links */}
          <View className="px-6 mb-6">
            <View className="flex-row">
              <QuickLink
                emoji="🌾"
                label="My Store"
                subtitle="Manage stock"
                onPress={() => router.push("/farmer/my-products")}
                accent="#2D6A4F"
              />
              <QuickLink
                emoji="📈"
                label="Insights"
                subtitle="View sales"
                onPress={() => router.push("/farmer/dashboard")}
                accent="#40916C"
              />
            </View>
          </View>

          {/* Menu Sections */}
          <View className="px-6">
            <Section title="Account Details">
              <MenuRow emoji="👤" label="Profile Info" subtitle="Update name & phone" onPress={() => {}} />
              <MenuRow emoji="📍" label="Farm Location" subtitle={farmer?.location || "Update your address"} onPress={() => {}} />
              <MenuRow emoji="🛡️" label="Verification" rightText={farmer?.is_verified ? "Verified" : "Pending"} onPress={() => {}} />
            </Section>

            <Section title="Store Management">
              <MenuRow
                emoji="➕"
                label="Add New Product"
                subtitle="List fresh crops"
                onPress={() => router.push("/(tabs)/(farmer-tabs)/addProduct")}
              />
              <MenuRow
                emoji="🛒"
                label="Pending Orders"
                rightText={String(farmer?.total_orders || 0)}
                onPress={() => {}}
              />
            </Section>

            <Section title="App Settings">
              <MenuRow emoji="🔔" label="Notifications" subtitle="Alerts & sounds" onPress={() => {}} />
              <MenuRow emoji="🔄" label="Switch Role" subtitle="Enter Customer mode" onPress={logout} />
            </Section>

            <Section>
              <MenuRow emoji="🚪" label="Sign Out" onPress={handleLogout} danger />
            </Section>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}