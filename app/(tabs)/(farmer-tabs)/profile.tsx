import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/components/context/AuthContext";

// ─── Quick Link Card 
function QuickLink({
  emoji,
  label,
  subtitle,
  onPress,
  accent = "#1B4332",
}: {
  emoji: string;
  label: string;
  subtitle: string;
  onPress: () => void;
  accent?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{ backgroundColor: accent }}
      className="flex-1 rounded-[20px] p-4 mx-[5px]"
    >
      <Text className="text-[28px] mb-2.5">{emoji}</Text>
      <Text className="text-white font-[800] text-[14px]">{label}</Text>
      <Text className="text-white/60 text-[11px] mt-0.5">{subtitle}</Text>
    </TouchableOpacity>
  );
}

// ─── Menu Row
function MenuRow({
  emoji,
  label,
  subtitle,
  onPress,
  danger = false,
  rightText,
}: {
  emoji: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  rightText?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center py-3.5 border-b border-[#F0FAF4]"
    >
      <View
        className={`w-[38px] h-[38px] rounded-xl items-center justify-center mr-3.5 ${
          danger ? "bg-[#FEF2F2]" : "bg-[#F0FAF4]"
        }`}
      >
        <Text className="text-[18px]">{emoji}</Text>
      </View>
      <View className="flex-1">
        <Text
          className={`text-[14px] font-semibold ${
            danger ? "text-[#DC2626]" : "text-[#1B4332]"
          }`}
        >
          {label}
        </Text>
        {subtitle && (
          <Text className="text-[11px] text-[#95D5B2] mt-px">{subtitle}</Text>
        )}
      </View>
      {rightText && (
        <Text className="text-[#52B788] text-[12px] font-semibold mr-2">
          {rightText}
        </Text>
      )}
      <Text
        className={`text-[20px] ${danger ? "text-[#FCA5A5]" : "text-[#D8F3DC]"}`}
      >
        ›
      </Text>
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View className="bg-white rounded-[20px] px-4 mb-3">
      {title && (
        <Text className="text-[#95D5B2] text-[10px] font-bold uppercase tracking-[1.5px] pt-3.5 pb-1">
          {title}
        </Text>
      )}
      {children}
      <View className="h-0.5" />
    </View>
  );
}

// ─── Farmer Profile Screen 
export default function FarmerProfileScreen() {
  const { logout } = useAuth();
  const router = useRouter();

  const farmer = {
    name: "Jean-Pierre Nkomo",
    email: "jp.nkomo@email.com",
    location: "Bafoussam, West Region",
    memberSince: "2025",
    totalProducts: 14,
    totalOrders: 38,
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <View className="flex-1 bg-[#F0FAF4]">
      <SafeAreaView className="flex-1">
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Bold header */}
          <View className="px-5 pt-5 pb-4">
            <Text className="text-[#1B4332] text-[32px] font-[900] tracking-[-1px]">
              Profile
            </Text>
          </View>

          {/* Hero card */}
          <View className="mx-5 bg-[#1B4332] rounded-[24px] p-5 mb-3">
            <View className="flex-row items-center mb-5">
              {/* Avatar */}
              <View className="w-[68px] h-[68px] rounded-[20px] bg-[#2D6A4F] items-center justify-center mr-4">
                <Text className="text-[34px]">👨‍🌾</Text>
              </View>

              <View className="flex-1">
                <Text className="text-white font-[800] text-[17px]" numberOfLines={1}>
                  {farmer.name}
                </Text>
                <Text className="text-[#52B788] text-[12px] mt-0.5">{farmer.email}</Text>
                <View className="self-start bg-[#2D6A4F] rounded-full px-2.5 py-1 mt-2">
                  <Text className="text-[#95D5B2] text-[11px] font-bold">🌱 Farmer</Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                className="bg-[#2D6A4F] rounded-xl px-3.5 py-2"
              >
                <Text className="text-[#95D5B2] text-[12px] font-bold">Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Stats strip */}
            <View className="flex-row bg-[#2D6A4F] rounded-[16px] overflow-hidden">
              {[
                { label: "Products", value: String(farmer.totalProducts) },
                { label: "Orders", value: String(farmer.totalOrders) },
                { label: "Since", value: farmer.memberSince },
              ].map((s, i) => (
                <View
                  key={i}
                  className={`flex-1 items-center py-3 ${
                    i < 2 ? "border-r border-[#1B4332]" : ""
                  }`}
                >
                  <Text className="text-white font-[800] text-[16px]">{s.value}</Text>
                  <Text className="text-[#52B788] text-[10px] mt-0.5">{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Quick links */}
          <View className="mx-5 mb-3">
            <Text className="text-[#95D5B2] text-[10px] font-bold uppercase tracking-[1.5px] mb-2.5 ml-1">
              Quick access
            </Text>
            <View className="flex-row">
              <QuickLink
                emoji="🌾"
                label="My Products"
                subtitle={`${farmer.totalProducts} listed`}
                onPress={() => router.push("/farmer/my-products")}
                accent="#2D6A4F"
              />
              <QuickLink
                emoji="📊"
                label="Dashboard"
                subtitle="Stats & insights"
                onPress={() => router.push("/farmer/dashboard")}
                accent="#40916C"
              />
            </View>
          </View>

          {/* Menu sections */}
          <View className="px-5">
            <Section title="Account">
              <MenuRow emoji="✏️" label="Edit profile" subtitle="Name, phone and location" onPress={() => {}} />
              <MenuRow emoji="🔒" label="Change password" subtitle="Keep your account secure" onPress={() => {}} />
              <MenuRow emoji="📍" label="Farm location" subtitle={farmer.location} onPress={() => {}} />
            </Section>

            <Section title="My Farm">
              <MenuRow
                emoji="🌾"
                label="My products"
                subtitle="Manage your listings"
                rightText={`${farmer.totalProducts}`}
                onPress={() => router.push("/farmer/my-products")}
              />
              <MenuRow
                emoji="📦"
                label="Incoming orders"
                subtitle="Orders from customers"
                rightText={`${farmer.totalOrders}`}
                onPress={() => router.push("/farmer/dashboard")}
              />
              <MenuRow
                emoji="➕"
                label="Add new product"
                subtitle="List a new item"
                onPress={() => router.push("/(tabs)/(farmer-tabs)/addProduct")}
              />
            </Section>

            <Section title="Preferences">
              <MenuRow emoji="🔔" label="Notifications" subtitle="Manage push alerts" onPress={() => {}} />
              <MenuRow emoji="🌐" label="Language" subtitle="English" onPress={() => {}} />
            </Section>

            <Section title="More">
              <MenuRow emoji="🔄" label="Switch to customer" subtitle="Log out and switch role" onPress={logout} />
              <MenuRow emoji="❓" label="Help & support" onPress={() => {}} />
              <MenuRow emoji="📄" label="Terms & Privacy" onPress={() => {}} />
            </Section>

            <Section>
              <MenuRow emoji="🚪" label="Log out" onPress={handleLogout} danger />
            </Section>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}