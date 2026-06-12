import { useAuth } from "@/components/context/AuthContext";
import MessageFarmerButton from "@/components/MessageFarmerButton";
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Circle, Path, Svg } from "react-native-svg";

const API_URL = Constants.expoConfig?.extra?.API_URL;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SLIDE_WIDTH = SCREEN_WIDTH - 40;
const GAP = 16;
const ITEM_LENGTH = SLIDE_WIDTH + GAP;

const CATEGORIES = [
  { id: "1", label: "All", emoji: "" },
  { id: "2", label: "Veggies", emoji: "🥕" },
  { id: "3", label: "Fruits", emoji: "🍎" },
  { id: "4", label: "Grains", emoji: "🌾" },
  { id: "5", label: "Herbs", emoji: "🌿" },
  { id: "6", label: "Roots", emoji: "🌽" },
];

const CAROUSEL = [
  {
    id: "c1",
    title: "Fresh harvest\njust arrived",
    subtitle: "DIRECT FROM BUEA FARMS",
    image:
      "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "c2",
    title: "Organic Red Moka\n& Sweet Potatoes",
    subtitle: "50% OFF DELIVERY THIS WEEK",
    image:
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "c3",
    title: "Support Local\nAgro-Creators",
    subtitle: "100% VERIFIED MERCHANTS",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
  },
];

const SEAMLESS = [
  { ...CAROUSEL[CAROUSEL.length - 1], id: "clone-last" },
  ...CAROUSEL,
  { ...CAROUSEL[0], id: "clone-first" },
];

function getEmoji(category: string) {
  switch (category?.toLowerCase()) {
    case "veggies":
      return "🥕";
    case "fruits":
      return "🍎";
    case "grains":
      return "🌾";
    case "herbs":
      return "🌿";
    case "roots":
      return "🌽";
    default:
      return "📦";
  }
}

function MatchBadge({ label }: { label?: string }) {
  if (!label) return null;
  const colors: Record<string, { bg: string; text: string }> = {
    Nearby: { bg: "#D8F3DC", text: "#1B4332" },
    "Your Region": { bg: "#FEF3C7", text: "#92400E" },
    Recommended: { bg: "#EDE9FE", text: "#5B21B6" },
  };
  const c = colors[label] || colors["Recommended"];
  return (
    <View
      style={{
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 99,
        backgroundColor: c.bg,
        alignSelf: "flex-start",
        marginBottom: 4,
      }}
    >
      <Text style={{ color: c.text, fontSize: 9, fontWeight: "700" }}>
        {label === "Nearby" ? "" : label === "Your Region" ? "" : ""}
        {label}
      </Text>
    </View>
  );
}

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="flex-row items-center bg-[#F0FAF4] rounded-2xl px-4 h-12 border border-[#D8F3DC]">
      <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <Circle cx="11" cy="11" r="7" stroke="#2D6A4F" strokeWidth="1.8" />
        <Path
          d="M17 17L21 21"
          stroke="#2D6A4F"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </Svg>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search fresh produce…"
        placeholderTextColor="#95D5B2"
        className="flex-1 ml-2.5 text-[#1B4332] text-[15px] font-medium"
      />
    </View>
  );
}

function ProductCard({ item, router }: { item: any; router: any }) {
  const img = item?.image || item?.photos?.[0];
  return (
    <TouchableOpacity
      onPress={() => router.push(`/product/${item.id}`)}
      activeOpacity={0.85}
      className="w-40 rounded-[28px] p-2 mr-3.5 border border-[#D8F3DC] bg-white shadow-sm"
    >
      <View className="h-[110px] rounded-2xl items-center justify-center mb-2.5 bg-[#F0FAF4] overflow-hidden border border-[#E2F5E9]">
        {img ? (
          <Image
            source={{ uri: img }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <Text className="text-4xl">{getEmoji(item.category)}</Text>
        )}
      </View>
      <View className="px-1.5 pb-1">
        <MatchBadge label={item.match_label} />
        <Text
          className="text-[#1B4332] font-extrabold text-[13px]"
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          className="text-[#52B788] text-[11px] font-semibold mt-0.5"
          numberOfLines={1}
        >
          {item.farmer?.full_name || "Verified Merchant"}
        </Text>
        <View className="flex-row items-center justify-between mt-2 pt-1 border-t border-[#F0FAF4]">
          <Text className="text-[#2D6A4F] font-black text-[13px]">
            {item.price} XAF
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { role, user } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("1");
  const [products, setProducts] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationLabel, setLocationLabel] = useState("");

  const [currentRealIndex, setCurrentRealIndex] = useState(0);
  const internalIndexRef = useRef(1);
  const flatListRef = useRef<FlatList>(null);
  const autoPlayTimerRef = useRef<any>(null);

  const startAutoPlay = () => {
    stopAutoPlay();
    autoPlayTimerRef.current = setInterval(() => {
      const next = internalIndexRef.current + 1;
      flatListRef.current?.scrollToOffset({
        offset: next * ITEM_LENGTH,
        animated: true,
      });
      internalIndexRef.current = next;
    }, 3500);
  };

  const stopAutoPlay = () => {
    if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
  };

  const handleScrollAction = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const exact = x / ITEM_LENGTH;
    const round = Math.round(exact);

    if (round >= 1 && round <= CAROUSEL.length) setCurrentRealIndex(round - 1);

    if (exact <= 0.1) {
      flatListRef.current?.scrollToOffset({
        offset: CAROUSEL.length * ITEM_LENGTH,
        animated: false,
      });
      internalIndexRef.current = CAROUSEL.length;
      setCurrentRealIndex(CAROUSEL.length - 1);
    } else if (exact >= CAROUSEL.length + 0.9) {
      flatListRef.current?.scrollToOffset({
        offset: ITEM_LENGTH,
        animated: false,
      });
      internalIndexRef.current = 1;
      setCurrentRealIndex(0);
    } else {
      internalIndexRef.current = round;
    }
  };

  useEffect(() => {
    if (!loading) startAutoPlay();
    return () => stopAutoPlay();
  }, [loading]);

  // ── Fetch location-aware data ─────────────────────────────────────────────
  const fetchData = async () => {
    try {
      if (!API_URL) return;

      // Get auth token
      const token =
        (await AsyncStorage.getItem("access_token")) ||
        (await AsyncStorage.getItem("nebo_token")) ||
        (await AsyncStorage.getItem("token"));

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // ── Recommended products (location-aware) ──────────────────────────
      if (token) {
        try {
          const prodRes = await fetch(
            `${API_URL}/api/recommendations/products?limit=10`,
            { headers },
          );
          if (prodRes.ok) {
            const data = await prodRes.json();
            setProducts(data);

            // Show the user what tier most results are
            if (data.length > 0) {
              const nearbyCount = data.filter(
                (p: any) => p.match_label === "Nearby",
              ).length;
              if (nearbyCount > 0) {
                setLocationLabel(`${nearbyCount} near you`);
              }
            }
          } else {
            // Fallback to plain product list
            await fetchPlainProducts();
          }
        } catch {
          await fetchPlainProducts();
        }
      } else {
        await fetchPlainProducts();
      }

      // ── Recommended farmers (location-aware) ───────────────────────────
      if (token) {
        try {
          const farmerRes = await fetch(
            `${API_URL}/api/recommendations/farmers?limit=6`,
            { headers },
          );
          if (farmerRes.ok) {
            setFarmers(await farmerRes.json());
          } else {
            await fetchPlainFarmers(headers);
          }
        } catch {
          await fetchPlainFarmers(headers);
        }
      } else {
        await fetchPlainFarmers(headers);
      }
    } catch (err) {
      console.error("HomeScreen fetchData error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPlainProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/products`);
      if (res.ok) setProducts((await res.json()).slice(0, 10));
    } catch {}
  };

  const fetchPlainFarmers = async (headers: Record<string, string>) => {
    try {
      const res = await fetch(`${API_URL}/api/users?role=farmer`, { headers });
      if (res.ok) setFarmers((await res.json()).slice(0, 6));
    } catch {
      setFarmers([
        {
          id: "f1",
          full_name: "Nkomo Farms",
          location: "Bafoussam",
          profile_pic: null,
        },
        {
          id: "f2",
          full_name: "Green Valley Collective",
          location: "Buea",
          profile_pic: null,
        },
      ]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Filter by search + category client-side
  const filtered = products.filter((item) => {
    const matchSearch = item.name?.toLowerCase().includes(search.toLowerCase());
    if (activeCategory === "1") return matchSearch;
    const target = CATEGORIES.find(
      (c) => c.id === activeCategory,
    )?.label.toLowerCase();
    return matchSearch && item.category?.toLowerCase() === target;
  });

  return (
    <View className="flex-1 bg-[#F8FDF9]">
      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1B4332"
            />
          }
        >
          {/* Header */}
          <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
            <View>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-[#52B788] text-[13px] font-black uppercase tracking-wider">
                  {greeting}
                </Text>
                <Ionicons name="sunny" size={14} color="#FFB703" />
              </View>
              <Text className="text-[#1B4332] text-2xl font-black mt-0.5 tracking-tight">
                What's fresh today?
              </Text>
              {/* Location label */}
              {(user?.location || locationLabel) && (
                <View className="flex-row items-center mt-1 gap-1">
                  <Feather name="map-pin" size={11} color="#52B788" />
                  <Text className="text-[#52B788] text-[11px] font-semibold">
                    {locationLabel || user?.location}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/profile")}
              className="w-14 h-14 rounded-3xl overflow-hidden bg-white border border-[#D8F3DC] shadow-sm items-center justify-center"
            >
              <Image
                source={require("@/assets/images/logo.png")}
                className="w-full h-full"
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="px-5 mb-5">
            <SearchBar value={search} onChange={setSearch} />
          </View>

          {/* Carousel */}
          <View className="mb-6">
            <FlatList
              ref={flatListRef}
              data={SEAMLESS}
              horizontal
              pagingEnabled={false}
              snapToInterval={ITEM_LENGTH}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              initialScrollIndex={1}
              getItemLayout={(_, index) => ({
                length: ITEM_LENGTH,
                offset: ITEM_LENGTH * index,
                index,
              })}
              onScroll={handleScrollAction}
              onScrollBeginDrag={stopAutoPlay}
              onScrollEndDrag={startAutoPlay}
              scrollEventThrottle={16}
              keyExtractor={(item, i) => `${item.id}-${i}`}
              renderItem={({ item }) => (
                <View
                  style={{ width: SLIDE_WIDTH, marginRight: GAP }}
                  className="h-40 rounded-[28px] overflow-hidden relative shadow-md bg-[#2D6A4F]"
                >
                  <Image
                    source={{ uri: item.image }}
                    className="w-full h-full absolute top-0 left-0"
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 bg-black/40 p-6 justify-center">
                    <Text className="text-white/80 text-[10px] font-black uppercase tracking-[2px] mb-1">
                      {item.subtitle}
                    </Text>
                    <Text className="text-white text-[20px] font-black leading-6 tracking-tight">
                      {item.title}
                    </Text>
                  </View>
                </View>
              )}
            />
            <View className="flex-row justify-center items-center mt-3 gap-1.5">
              {CAROUSEL.map((_, i) => (
                <View
                  key={i}
                  className={`rounded-full h-1.5 ${currentRealIndex === i ? "w-5 bg-[#2D6A4F]" : "w-1.5 bg-[#D8F3DC]"}`}
                />
              ))}
            </View>
          </View>

          {/* Categories */}
          <View className="mb-5">
            <Text className="text-[#1B4332] font-black text-[15px] px-5 mb-3 tracking-tight">
              Categories
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setActiveCategory(cat.id)}
                  className={`flex-row items-center rounded-full px-4 py-2 mr-2.5 border ${
                    activeCategory === cat.id
                      ? "bg-[#2D6A4F] border-[#2D6A4F]"
                      : "bg-white border-[#D8F3DC] shadow-sm"
                  }`}
                >
                  <Text className="text-[15px] mr-1.5">{cat.emoji}</Text>
                  <Text
                    className={`text-[13px] font-bold ${activeCategory === cat.id ? "text-white" : "text-[#2D6A4F]"}`}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Featured Produce */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between px-5 mb-3">
              <View>
                <Text className="text-[#1B4332] font-black text-[15px] tracking-tight">
                  Featured Produce
                </Text>
                {locationLabel ? (
                  <Text className="text-[#52B788] text-[11px] font-semibold mt-0.5">
                    📍 {locationLabel}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => router.push("/marketplace")}>
                <Text className="text-[#52B788] text-[13px] font-bold">
                  See all
                </Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color="#1B4332" className="my-10" />
            ) : filtered.length === 0 ? (
              <View className="mx-5 bg-[#F0FAF4] rounded-2xl p-8 items-center border border-dashed border-[#D8F3DC]">
                <Text className="text-xl mb-1">🍃</Text>
                <Text className="text-[#2D6A4F] text-xs font-bold">
                  No produce matches this selection yet.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
              >
                {filtered.map((item) => (
                  <ProductCard key={item.id} item={item} router={router} />
                ))}
              </ScrollView>
            )}
          </View>

          {/* Nearby Farmers */}
          <View className="px-5">
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-[#1B4332] font-black text-[15px] tracking-tight">
                  Nearby Farmers
                </Text>
                {user?.location && (
                  <Text className="text-[#52B788] text-[11px] font-semibold mt-0.5">
                    📍 Near {user.location}
                  </Text>
                )}
              </View>
              <TouchableOpacity>
                <Text className="text-[#52B788] text-[13px] font-bold">
                  See all
                </Text>
              </TouchableOpacity>
            </View>

            {farmers.map((farmer) => (
              <View
                key={farmer.id}
                className="flex-row items-center bg-white rounded-2xl p-4 mb-3 border border-[#D8F3DC] shadow-sm"
              >
                <View className="w-12 h-12 rounded-xl bg-[#F0FAF4] items-center justify-center mr-3.5 border border-[#D8F3DC] overflow-hidden">
                  {farmer.avatar_url || farmer.profile_pic ? (
                    <Image
                      source={{ uri: farmer.avatar_url || farmer.profile_pic }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="person-outline" size={24} color="#1B7344" />
                  )}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-[#1B4332] font-black text-[14px]">
                      {farmer.full_name || farmer.name}
                    </Text>
                    {farmer.is_verified && (
                      <Text style={{ fontSize: 12 }}>✅</Text>
                    )}
                  </View>
                  <View className="flex-row items-center mt-0.5 gap-1">
                    <Feather name="map-pin" size={11} color="#52B788" />
                    <Text className="text-[#95D5B2] text-xs font-bold">
                      {farmer.location || "Cameroon"}
                    </Text>
                  </View>
                  {/* Match badge */}
                  {farmer.match_label &&
                    farmer.match_label !== "Recommended" && (
                      <MatchBadge label={farmer.match_label} />
                    )}
                  {/* Product count */}
                  {farmer.product_count > 0 && (
                    <Text className="text-[#B7E4C7] text-[10px] mt-0.5">
                      {farmer.product_count} product
                      {farmer.product_count !== 1 ? "s" : ""} listed
                    </Text>
                  )}
                </View>
                <MessageFarmerButton
                  farmerId={farmer.id}
                  farmerName={farmer.full_name || farmer.name || "Farmer"}
                  farmerPhone={farmer.phone}
                  variant="icon"
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
