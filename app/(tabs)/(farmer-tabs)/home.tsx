import { useAuth } from "@/components/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = Constants.expoConfig?.extra?.API_URL;

const CATEGORIES = [
  { id: "1", label: "All", emoji: "" },
  { id: "2", label: "Veggies", emoji: "🥦" },
  { id: "3", label: "Fruits", emoji: "🍎" },
  { id: "4", label: "Grains", emoji: "🌾" },
  { id: "5", label: "Herbs", emoji: "🌿" },
  { id: "6", label: "Roots", emoji: "🥕" },
];

const STATIC_FARMERS = [
  { id: "1", name: "Nkomo Farm", location: "Bafoussam", rating: 4.8 },
  { id: "2", name: "Green Valley", location: "Buea", rating: 4.6 },
];

function SearchBar({
  value,
  onChange,
  isFarmer,
}: {
  value: string;
  onChange: (v: string) => void;
  isFarmer: boolean;
}) {
  return (
    <View className="flex-row items-center bg-[#F0FAF4] rounded-2xl px-4 h-12 border border-[#D8F3DC]">
      <Feather name="search" size={18} color="#95D5B2" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={
          isFarmer ? "Search your inventory…" : "Search fresh produce…"
        }
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
  const [farmers, setFarmers] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [userProfile, setUserProfile] = useState<any>(null);

  const isFarmer = role === "farmer";

  // ───────────────────────────────
  // FETCH BACKEND DATA (RECOMMENDATIONS)
  // ───────────────────────────────
  const fetchHomeData = async () => {
    try {
      const token =
        (await AsyncStorage.getItem("access_token")) ||
        (await AsyncStorage.getItem("nebo_token")) ||
        (await AsyncStorage.getItem("token"));

      const headers: any = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      // ── USER PROFILE (UNCHANGED UI SUPPORT)
      try {
        const userRes = await fetch(`${API_URL}/api/auth/me`, { headers });
        if (userRes.ok) {
          setUserProfile(await userRes.json());
        }
      } catch {}

      // ── PRODUCTS (RECOMMENDATIONS BACKEND)
      try {
        const prodRes = await fetch(
          `${API_URL}/api/recommendations/products?limit=10`,
          { headers }
        );

        if (prodRes.ok) {
          setProducts(await prodRes.json());
        } else {
          const fallback = await fetch(`${API_URL}/api/products/my`, {
            headers,
          });

          if (fallback.ok) {
            setProducts(await fallback.json());
          }
        }
      } catch {
        try {
          const fallback = await fetch(`${API_URL}/api/products/my`, {
            headers,
          });
          if (fallback.ok) setProducts(await fallback.json());
        } catch {}
      }

      // ── FARMERS (RECOMMENDATIONS BACKEND)
      try {
        const farmerRes = await fetch(
          `${API_URL}/api/recommendations/farmers?limit=6`,
          { headers }
        );

        if (farmerRes.ok) {
          setFarmers(await farmerRes.json());
        } else {
          const fallback = await fetch(`${API_URL}/api/users?role=farmer`, {
            headers,
          });

          if (fallback.ok) {
            setFarmers(await fallback.json());
          } else {
            setFarmers(STATIC_FARMERS);
          }
        }
      } catch {
        try {
          const fallback = await fetch(`${API_URL}/api/users?role=farmer`, {
            headers,
          });

          if (fallback.ok) setFarmers(await fallback.json());
          else setFarmers(STATIC_FARMERS);
        } catch {
          setFarmers(STATIC_FARMERS);
        }
      }
    } catch (err) {
      console.error("HomeScreen fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, [role]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHomeData();
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <View className="flex-1 bg-[#F8FDF9]">
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* HEADER (UNCHANGED UI) */}
          <View className="px-5 pt-5 pb-3 flex-row items-center justify-between">
            <View>
              <Text className="text-[#95D5B2] text-[13px] font-bold uppercase tracking-wider">
                {greeting}
                {isFarmer ? "," : ""}
              </Text>

              <Text className="text-[#1B4332] text-2xl font-extrabold mt-0.5 tracking-tight">
                {isFarmer ? "Your Farm Listings" : "What's fresh today?"}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/profile")}
              className="w-11 h-11 rounded-full bg-[#D8F3DC] items-center justify-center border border-[#B7E4C7] overflow-hidden"
            >
              {userProfile?.avatar_url ? (
                <Image
                  source={{ uri: userProfile.avatar_url }}
                  className="w-full h-full"
                />
              ) : (
                <Feather
                  name={isFarmer ? "user" : "shopping-bag"}
                  size={18}
                  color="#1B4332"
                />
              )}
            </TouchableOpacity>
          </View>

          {/* SEARCH (UNCHANGED UI) */}
          <View className="px-5 mb-5">
            <SearchBar
              value={search}
              onChange={setSearch}
              isFarmer={isFarmer}
            />
          </View>

          {/* BANNER (UNCHANGED UI) */}
          <View className="mx-5 rounded-3xl overflow-hidden bg-[#2D6A4F] mb-6 shadow-sm">
            <View className="px-5 py-5 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-[#95D5B2] text-[10px] font-black uppercase tracking-[1.5px] mb-1">
                  {isFarmer ? "Stock Actions" : "This week"}
                </Text>

                <Text className="text-white text-[18px] font-black leading-6">
                  {isFarmer
                    ? "Need to update\nyour stock levels?"
                    : "Fresh harvest\njust arrived"}
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    router.push(
                      isFarmer
                        ? "/(tabs)/(farmer-tabs)/addProduct"
                        : "/marketplace"
                    )
                  }
                  className="bg-white rounded-full px-4 py-2.5 self-start mt-4 shadow-sm"
                >
                  <Text className="text-[#2D6A4F] text-xs font-black">
                    {isFarmer ? "Add Product +" : "Shop now →"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Feather
                name={isFarmer ? "plus-circle" : "activity"}
                size={54}
                color="#B7E4C7"
                style={{ opacity: 0.6 }}
              />
            </View>
          </View>

          {/* CATEGORY (UNCHANGED UI) */}
          <View className="mb-5">
            <Text className="text-[#1B4332] font-black text-[15px] px-5 mb-3">
              {isFarmer
                ? "Filter Inventory By Category"
                : "Categories"}
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;

                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setActiveCategory(cat.id)}
                    className="flex-row items-center rounded-full px-4 py-2.5 mr-2.5 bg-[#F0FAF4] border border-[#D8F3DC]"
                  >
                    <Text>{cat.emoji}</Text>
                    <Text className="text-[#2D6A4F] font-bold ml-1.5">
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* PRODUCTS (BACKEND CONNECTED) */}
          <View className="mb-6">
            <Text className="text-[#1B4332] font-black text-[15px] px-5 mb-3">
              {isFarmer ? "Your Active Items" : "Featured produce"}
            </Text>

            {loading ? (
              <ActivityIndicator color="#1B4332" />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {products.map((item) => {
                  const image =
                    item?.image || item?.photos?.[0] || null;

                  return (
                    <View
                      key={item.id}
                      className="w-40 rounded-3xl p-3 mr-3 bg-[#F0FAF4] border border-[#D8F3DC]"
                    >
                      <View className="h-[90px] bg-white rounded-2xl mb-2 overflow-hidden">
                        {image ? (
                          <Image
                            source={{ uri: image }}
                            className="w-full h-full"
                          />
                        ) : (
                          <Feather
                            name="package"
                            size={28}
                            color="#52B788"
                          />
                        )}
                      </View>

                      <Text className="text-[#1B4332] font-black">
                        {item.name}
                      </Text>

                      <Text className="text-[#52B788] text-xs">
                        {isFarmer
                          ? `${item.quantity || 0} ${item.unit || "units"}`
                          : item.farmer?.full_name || "Farmer"}
                      </Text>

                      <Text className="text-[#2D6A4F] font-black mt-1">
                        {item.price} XAF
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* FARMERS (BACKEND CONNECTED) */}
          <View className="px-5">
            <Text className="text-[#1B4332] font-black text-[15px] mb-3">
              {isFarmer ? "Top Region Producers" : "Nearby farmers"}
            </Text>

            {farmers.map((farmer) => (
              <View
                key={farmer.id}
                className="flex-row items-center bg-white rounded-2xl px-4 py-3 mb-3 border border-[#D8F3DC]"
              >
                <View className="w-12 h-12 rounded-full bg-[#D8F3DC] items-center justify-center mr-3">
                  <Feather name="user" size={18} color="#1B4332" />
                </View>

                <View className="flex-1">
                  <Text className="text-[#1B4332] font-bold">
                    {farmer.full_name || farmer.name}
                  </Text>
                  <Text className="text-[#95D5B2] text-xs">
                    {farmer.location}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}