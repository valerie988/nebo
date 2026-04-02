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

// ─── Menu Row ─────────────────────────────────────────────────────────────────
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
      {/* Icon */}
      <View
        className={`w-[38px] h-[38px] rounded-xl items-center justify-center mr-3.5 ${
          danger ? "bg-red-50" : "bg-[#F0FAF4]"
        }`}
      >
        <Text className="text-lg">{emoji}</Text>
      </View>

      {/* Text */}
      <View className="flex-1">
        <Text className={`text-sm font-semibold ${danger ? "text-red-600" : "text-[#1B4332]"}`}>
          {label}
        </Text>
        {subtitle && (
          <Text className="text-[11px] color-[#95D5B2] mt-0.5">{subtitle}</Text>
        )}
      </View>

      {rightText && (
        <Text className="text-[#52B788] text-xs font-semibold mr-2">
          {rightText}
        </Text>
      )}

      <Text className={`text-xl font-light ${danger ? "text-red-300" : "text-[#D8F3DC]"}`}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View className="bg-white rounded-[20px] px-4 mb-3">
      {title ? (
        <Text className="text-[#95D5B2] text-[10px] font-bold uppercase tracking-[1.5px] pt-3.5 pb-1">
          {title}
        </Text>
      ) : null}
      {children}
      <View className="h-0.5" />
    </View>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { role, logout } = useAuth();
  const router = useRouter();

  const user = {
    name: role === "farmer" ? "Jean-Pierre Nkomo" : "Amina Oumarou",
    email: role === "farmer" ? "jp.nkomo@email.com" : "amina.o@email.com",
    location: role === "farmer" ? "Bafoussam, West Region" : "Yaoundé, Centre",
    avatar: role === "farmer" ? "👨‍🌾" : "👩‍🛍️",
    memberSince: "March 2025",
    ordersCount: 12,
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out of NEBO?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);
  };

  const handleSwitchRole = () => {
    Alert.alert(
      "Switch role",
      `You're signed in as a ${role}. This will log you out.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Switch & log out", style: "destructive", onPress: logout },
      ]
    );
  };

  return (
    <View className="flex-1 bg-[#F0FAF4]">
      <SafeAreaView className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          
          {/* Header */}
          <View className="px-5 pt-5 pb-4">
            <Text className="text-[#1B4332] text-[32px] font-black tracking-tighter">
              Profile
            </Text>
          </View>

          {/* Profile Hero Card */}
          <View className="mx-5 bg-[#1B4332] rounded-3xl p-5 mb-3">
            <View className="flex-row items-center">
              {/* Avatar */}
              <View className="w-[68px] h-[68px] rounded-[20px] bg-[#2D6A4F] items-center justify-center mr-4">
                <Text className="text-[34px]">{user.avatar}</Text>
              </View>

              {/* Name + Role */}
              <View className="flex-1">
                <Text className="text-white font-extrabold text-[17px]" numberOfLines={1}>
                  {user.name}
                </Text>
                <Text className="text-[#52B788] text-xs mt-0.5">{user.email}</Text>
                <View className="self-start bg-[#2D6A4F] rounded-full px-2.5 py-1 mt-2">
                  <Text className="text-[#95D5B2] text-[11px] font-bold capitalize">
                    {role}
                  </Text>
                </View>
              </View>

              {/* Edit Button */}
              <TouchableOpacity className="bg-[#2D6A4F] rounded-xl px-3.5 py-2">
                <Text className="text-[#95D5B2] text-xs font-bold">Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Stats Row */}
            <View className="flex-row mt-5 bg-[#2D6A4F] rounded-2xl overflow-hidden">
              {[
                { label: "Orders", value: String(user.ordersCount) },
                { label: "Location", value: user.location.split(",")[0] },
                { label: "Member since", value: user.memberSince.split(" ")[1] },
              ].map((stat, i) => (
                <View
                  key={i}
                  className={`flex-1 items-center py-3 ${i < 2 ? "border-r border-[#1B4332]" : ""}`}
                >
                  <Text className="text-white font-extrabold text-[15px]">{stat.value}</Text>
                  <Text className="text-[#52B788] text-[10px] mt-0.5">{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Menu Sections */}
          <View className="px-5">
            <Section title="Account">
              <MenuRow emoji="✏️" label="Edit profile" subtitle="Name, phone and location" onPress={() => {}} />
              <MenuRow emoji="🔒" label="Change password" subtitle="Keep your account secure" onPress={() => {}} />
              <MenuRow emoji="📍" label="Delivery address" subtitle={user.location} onPress={() => {}} />
            </Section>

            <Section title="Activity">
              <MenuRow
                emoji="📦"
                label="My orders"
                subtitle="View your order history"
                rightText={`${user.ordersCount}`}
                onPress={() => router.push("/(tabs)/(customer-tabs)/orders")}
              />
              {role === "farmer" && (
                <MenuRow
                  emoji="🌾"
                  label="My products"
                  subtitle="Manage your listings"
                  onPress={() => router.push("/")}
                />
              )}
            </Section>

            <Section title="Preferences">
              <MenuRow emoji="🔔" label="Notifications" subtitle="Manage push alerts" onPress={() => {}} />
              <MenuRow emoji="🌐" label="Language" subtitle="English" onPress={() => {}} />
            </Section>

            <Section title="More">
              <MenuRow emoji="🔄" label="Switch role" subtitle={`Currently: ${role}`} onPress={handleSwitchRole} />
              <MenuRow emoji="❓" label="Help & support" onPress={() => {}} />
              <MenuRow emoji="📄" label="Terms & Privacy" onPress={() => {}} />
            </Section>

            <Section>
              <MenuRow emoji="🚪" label="Log out" onPress={handleLogout} danger />
            </Section>

            <Text className="text-center text-[#95D5B2] text-[11px] mt-2 mb-10">
              NEBO v1.0.0 · Made with 🌿
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}