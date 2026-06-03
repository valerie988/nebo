import { useAuth } from "@/components/context/AuthContext";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = Constants.expoConfig?.extra?.API_URL;

const CATEGORIES = [
  { id: "1", label: "All", emoji: "📋" },
  { id: "2", label: "Veggies", emoji: "🥦" }, 
  { id: "3", label: "Fruits", emoji: "🍎" },
  { id: "4", label: "Grains", emoji: "🌾" },
  { id: "5", label: "Herbs", emoji: "🌿" },
  { id: "6", label: "Roots", emoji: "🥕" }
];

const STATIC_FARMERS = [
  { id: "1", name: "Nkomo Farm", location: "Bafoussam", rating: 4.8 },
  { id: "2", name: "Green Valley", location: "Buea", rating: 4.6 },
];

function SearchBar({ value, onChange, isFarmer }: { value: string; onChange: (v: string) => void; isFarmer: boolean }) {
  return (
    <View className="flex-row items-center bg-[#F0FAF4] rounded-2xl px-4 h-12 border border-[#D8F3DC]">
      <Feather name="search" size={18} color="#95D5B2" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={isFarmer ? "Search your inventory…" : "Search fresh produce…"}
        placeholderTextColor="#95D5B2"
        className="flex-1 ml-2.5 text-[#1B4332] text-[15px]"
      />
    </View>
  );
}

export default function HomeScreen() {
  const { role } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("1");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isFarmer = role === "farmer";

  const fetchHomeData = async () => {
    try {
      const token =
        (await AsyncStorage.getItem("nebo_token")) ||
        (await AsyncStorage.getItem("token"));
      const response = await fetch(`${API_URL}/api/products/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setProducts(data);
      }
    } catch (error) {
      console.error("Error fetching product roster:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchHomeData(); }, [role]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHomeData();
  }, [role]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <View className="flex-1 bg-[#F8FDF9]">
      <SafeAreaView className="flex-1">
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Header */}
          <View className="px-5 pt-5 pb-3 flex-row items-center justify-between">
            <View>
              <Text className="text-[#95D5B2] text-[13px] font-bold uppercase tracking-wider">
                {greeting}{isFarmer ? ", Management Portal" : ""}
              </Text>
              <Text className="text-[#1B4332] text-2xl font-extrabold mt-0.5 tracking-tight">
                {isFarmer ? "Your Farm Listings" : "What's fresh today?"}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => router.push("/profile")} 
              className="w-11 h-11 rounded-full bg-[#D8F3DC] items-center justify-center border border-[#B7E4C7]"
            >
              <Feather name={isFarmer ? "user" : "shopping-bag"} size={18} color="#1B4332" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="px-5 mb-5">
            <SearchBar value={search} onChange={setSearch} isFarmer={isFarmer} />
          </View>

          {/* Banner */}
          <View className="mx-5 rounded-3xl overflow-hidden bg-[#2D6A4F] mb-6 shadow-sm">
            <View className="px-5 py-5 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-[#95D5B2] text-[10px] font-black uppercase tracking-[1.5px] mb-1">
                  {isFarmer ? "Stock Actions" : "This week"}
                </Text>
                <Text className="text-white text-[18px] font-black leading-6">
                  {isFarmer ? "Need to update\nyour stock levels?" : "Fresh harvest\njust arrived"}
                </Text>
                <TouchableOpacity 
                  onPress={() => router.push(isFarmer ? "/(tabs)/(farmer-tabs)/addProduct" : "/marketplace")} 
                  className="bg-white rounded-full px-4 py-2.5 self-start mt-4 shadow-sm"
                >
                  <Text className="text-[#2D6A4F] text-xs font-black">
                    {isFarmer ? "Add Product +" : "Shop now →"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Feather name={isFarmer ? "plus-circle" : "activity"} size={54} color="#B7E4C7" style={{ opacity: 0.6 }} />
            </View>
          </View>

          {/* Categories */}
          <View className="mb-5">
            <Text className="text-[#1B4332] font-black text-[15px] px-5 mb-3">
              {isFarmer ? "Filter Inventory By Category" : "Categories"}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setActiveCategory(cat.id)}
                    className={`flex-row items-center rounded-full px-4 py-2.5 mr-2.5 border ${
                      isActive ? "bg-[#2D6A4F] border-[#2D6A4F]" : "bg-[#F0FAF4] border-[#D8F3DC]"
                    }`}
                  >
                    <Text className="text-[14px]">{cat.emoji}</Text>
                    <Text className={`text-[13px] font-bold ml-1.5 ${isActive ? "text-white" : "text-[#2D6A4F]"}`}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Featured Produce / Active Inventory List */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between px-5 mb-3">
              <Text className="text-[#1B4332] font-black text-[15px]">
                {isFarmer ? "Your Active Items" : "Featured produce"}
              </Text>
              <TouchableOpacity onPress={() => router.push("/marketplace")}>
                <Text className="text-[#52B788] text-[13px] font-bold">See all</Text>
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <ActivityIndicator color="#1B4332" className="my-10" />
            ) : products.length === 0 ? (
              <View className="mx-5 bg-[#F0FAF4] rounded-2xl p-6 border border-[#D8F3DC] items-center">
                <Text className="text-[#2D6A4F] font-bold text-xs">No catalog items listed yet.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                {products.map((item) => {
                  // ✨ FIXED: Extract actual product image link dynamically
                  const itemImageUri = item?.image || (item?.photos && item.photos[0]);
                  
                  return (
                    <TouchableOpacity
                      key={item.id || item._id}
                      onPress={() => router.push("/marketplace")}
                      activeOpacity={0.85}
                      className="w-40 rounded-3xl p-3.5 mr-3.5 border border-[#D8F3DC] bg-[#F0FAF4]"
                    >
                      {/* Image Viewer Frame */}
                      <View className="w-full h-[90px] rounded-2xl items-center justify-center mb-2.5 bg-white overflow-hidden">
                        {itemImageUri ? (
                          <Image source={{ uri: itemImageUri }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                          <Feather name="package" size={28} color="#52B788" />
                        )}
                      </View>
                      
                      <Text className="text-[#1B4332] font-black text-[13px]" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text className="text-[#52B788] text-[11px] font-semibold mt-0.5" numberOfLines={1}>
                        {isFarmer ? `${item.quantity || 0} ${item.unit || "units"} available` : (item.farmer_name || "Local Farmer")}
                      </Text>
                      <Text className="text-[#2D6A4F] font-black text-[14px] mt-1.5">
                        {item.price} XAF
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Nearby Farmers / Partners Grid */}
          <View className="px-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[#1B4332] font-black text-[15px]">
                {isFarmer ? "Top Region Producers" : "Nearby farmers"}
              </Text>
              <TouchableOpacity>
                <Text className="text-[#52B788] text-[13px] font-bold">See all</Text>
              </TouchableOpacity>
            </View>
            {STATIC_FARMERS.map((farmer) => (
              <TouchableOpacity key={farmer.id} className="flex-row items-center bg-white rounded-2xl px-4 py-3 mb-3 border border-[#D8F3DC] shadow-sm">
                <View className="w-12 h-12 rounded-full bg-[#D8F3DC] items-center justify-center mr-3 border border-[#B7E4C7]">
                  <Feather name="user" size={18} color="#1B4332" />
                </View>
                <View className="flex-1">
                  <Text className="text-[#1B4332] font-bold text-[14px]">{farmer.name}</Text>
                  <View className="flex-row items-center mt-0.5">
                    <Feather name="map-pin" size={10} color="#95D5B2" style={{ marginRight: 2 }} />
                    <Text className="text-[#95D5B2] text-[11px] font-semibold">{farmer.location}</Text>
                  </View>
                </View>
                <View className="flex-row items-center bg-[#F0FAF4] px-2.5 py-1 rounded-full border border-[#D8F3DC]">
                  <Feather name="star" size={10} color="#2D6A4F" style={{ marginRight: 4 }} />
                  <Text className="text-[#2D6A4F] font-black text-[12px]">{farmer.rating}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}