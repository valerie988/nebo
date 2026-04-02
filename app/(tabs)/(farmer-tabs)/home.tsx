import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { Svg, Path, Circle } from "react-native-svg";
import { useAuth } from "@/components/context/AuthContext";

// ─── Mock data ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "1", label: "All", emoji: "✨" },
  { id: "2", label: "Veggies", emoji: "🥦" },
  { id: "3", label: "Fruits", emoji: "🍊" },
  { id: "4", label: "Grains", emoji: "🌾" },
  { id: "5", label: "Herbs", emoji: "🌿" },
  { id: "6", label: "Roots", emoji: "🥕" },
];

const FEATURED = [
  { id: "1", name: "Fresh Tomatoes", farmer: "Nkomo Farm", price: "500 XAF / kg", emoji: "🍅", tag: "Popular", tagColor: "text-[#E74C3C]", tagBg: "bg-red-50", bg: "bg-[#FFF0EE]" },
  { id: "2", name: "Sweet Plantains", farmer: "Green Valley", price: "300 XAF / bunch", emoji: "🍌", tag: "Seasonal", tagColor: "text-[#F39C12]", tagBg: "bg-orange-50", bg: "bg-[#FFFBEE]" },
  { id: "3", name: "Garden Spinach", farmer: "Fokou Fields", price: "250 XAF / bunch", emoji: "🥬", tag: "Fresh", tagColor: "text-[#27AE60]", tagBg: "bg-green-50", bg: "bg-[#F0FAF4]" },
  { id: "4", name: "Organic Carrots", farmer: "Biya Roots", price: "400 XAF / kg", emoji: "🥕", tag: "Organic", tagColor: "text-[#E67E22]", tagBg: "bg-orange-50", bg: "bg-[#FFF5EE]" },
];

const NEARBY_FARMERS = [
  { id: "1", name: "Nkomo Farm", location: "Bafoussam", emoji: "👨‍🌾", rating: 4.8 },
  { id: "2", name: "Green Valley", location: "Buea", emoji: "👩‍🌾", rating: 4.6 },
  { id: "3", name: "Fokou Fields", location: "Yaoundé", emoji: "👨‍🌾", rating: 4.9 },
];

// ─── Search Bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View className="flex-row items-center bg-[#F0FAF4] rounded-2xl px-4 h-12 border border-[#D8F3DC]">
      <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <Circle cx="11" cy="11" r="7" stroke="#95D5B2" strokeWidth="1.8" />
        <Path d="M17 17L21 21" stroke="#95D5B2" strokeWidth="1.8" strokeLinecap="round" />
      </Svg>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search fresh produce…"
        placeholderTextColor="#95D5B2"
        className="flex-1 ml-2.5 text-[#1B4332] text-[15px]"
      />
    </View>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ item }: { item: (typeof FEATURED)[0] }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      className={`w-40 rounded-3xl p-3.5 mr-3.5 border border-[#D8F3DC] ${item.bg}`}
    >
      <View className="h-[90px] rounded-2xl items-center justify-center mb-2.5 bg-white/70">
        <Text className="text-5xl">{item.emoji}</Text>
      </View>

      <View className={`self-start rounded-full px-2 py-0.5 mb-1.5 ${item.tagBg}`}>
        <Text className={`${item.tagColor} text-[10px] font-semibold`}>
          {item.tag}
        </Text>
      </View>

      <Text className="text-[#1B4332] font-semibold text-[13px]" numberOfLines={1}>
        {item.name}
      </Text>
      <Text className="text-[#52B788] text-[11px] mt-0.5" numberOfLines={1}>
        {item.farmer}
      </Text>
      <Text className="text-[#2D6A4F] font-bold text-[13px] mt-1.5">
        {item.price}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Farmer Card ──────────────────────────────────────────────────────────────
function FarmerCard({ item }: { item: (typeof NEARBY_FARMERS)[0] }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      className="flex-row items-center bg-white rounded-2xl px-4 py-3 mb-3 border border-[#D8F3DC]"
    >
      <View className="w-12 h-12 rounded-full bg-[#D8F3DC] items-center justify-center mr-3">
        <Text className="text-2xl">{item.emoji}</Text>
      </View>

      <View className="flex-1">
        <Text className="text-[#1B4332] font-semibold text-[13px]">{item.name}</Text>
        <Text className="text-[#95D5B2] text-[11px] mt-0.5">📍 {item.location}</Text>
      </View>

      <View className="items-end">
        <Text className="text-[#2D6A4F] font-bold text-[13px]">⭐ {item.rating}</Text>
        <Text className="text-[#95D5B2] text-[11px] mt-0.5">View →</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { role } = useAuth();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("1");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <View className="flex-1 bg-[#F8FDF9]">
      <SafeAreaView className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          
          {/* Header */}
          <View className="px-5 pt-5 pb-3 flex-row items-center justify-between">
            <View>
              <Text className="text-[#95D5B2] text-[13px]">{greeting} 👋</Text>
              <Text className="text-[#1B4332] text-2xl font-extrabold mt-0.5 tracking-tight">
                Whats fresh today?
              </Text>
            </View>
            <View className="w-11 h-11 rounded-full bg-[#D8F3DC] items-center justify-center">
              <Text className="text-xl">{role === "farmer" ? "🌾" : "🛍️"}</Text>
            </View>
          </View>

          {/* Search */}
          <View className="px-5 mb-5">
            <SearchBar value={search} onChange={setSearch} />
          </View>

          {/* Banner */}
          <View className="mx-5 rounded-3xl overflow-hidden bg-[#2D6A4F] mb-6">
            <View className="px-5 py-5 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-[#95D5B2] text-[10px] font-bold uppercase tracking-[1.5px] mb-1">
                  This week
                </Text>
                <Text className="text-white text-[17px] font-extrabold leading-6">
                  Fresh harvest{"\n"}just arrived 🌿
                </Text>
                <TouchableOpacity className="bg-white rounded-full px-4 py-2 self-start mt-3">
                  <Text className="text-[#2D6A4F] text-xs font-bold">Shop now →</Text>
                </TouchableOpacity>
              </View>
              <Text className="text-7xl ml-2">🥬</Text>
            </View>
          </View>

          {/* Categories */}
          <View className="mb-5">
            <Text className="text-[#1B4332] font-bold text-[15px] px-5 mb-3">Categories</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setActiveCategory(cat.id)}
                  className={`flex-row items-center rounded-full px-3.5 py-2 mr-2.5 border ${
                    activeCategory === cat.id ? "bg-[#2D6A4F] border-[#2D6A4F]" : "bg-[#F0FAF4] border-[#D8F3DC]"
                  }`}
                >
                  <Text className="text-sm mr-1">{cat.emoji}</Text>
                  <Text className={`text-[13px] font-medium ${activeCategory === cat.id ? "text-white" : "text-[#2D6A4F]"}`}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Featured Produce */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between px-5 mb-3">
              <Text className="text-[#1B4332] font-bold text-[15px]">Featured produce</Text>
              <TouchableOpacity><Text className="text-[#52B788] text-[13px] font-medium">See all</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {FEATURED.map((item) => (
                <ProductCard key={item.id} item={item} />
              ))}
            </ScrollView>
          </View>

          {/* Nearby Farmers */}
          <View className="px-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[#1B4332] font-bold text-[15px]">Nearby farmers</Text>
              <TouchableOpacity><Text className="text-[#52B788] text-[13px] font-medium">See all</Text></TouchableOpacity>
            </View>
            {NEARBY_FARMERS.map((farmer) => (
              <FarmerCard key={farmer.id} item={farmer} />
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}