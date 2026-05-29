import { useAuth } from "@/components/context/AuthContext";
import { Feather, Ionicons } from "@expo/vector-icons";
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

// Responsive layout math to calculate precise slide sizing
const SLIDE_WIDTH = SCREEN_WIDTH - 40;
const GAP = 16;
const ITEM_LENGTH = SLIDE_WIDTH + GAP;

const CATEGORIES = [
  { id: "1", label: "All", emoji: "⭐" },
  { id: "2", label: "Veggies", emoji: "🥕" },
  { id: "3", label: "Fruits", emoji: "🍎" },
  { id: "4", label: "Grains", emoji: "🌾" },
  { id: "5", label: "Herbs", emoji: "🌿" },
  { id: "6", label: "Roots", emoji: "🌽" },
];

// Raw Core Carousel Data (Cleaned and absolute CDN imagery)
const REAL_CAROUSEL_ITEMS = [
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

// 🌟 INFINITE LOOP TRICK DATA ARRAY CREATION
const SEAMLESS_CAROUSEL_DATA = [
  { ...REAL_CAROUSEL_ITEMS[REAL_CAROUSEL_ITEMS.length - 1], id: "clone-last" },
  ...REAL_CAROUSEL_ITEMS,
  { ...REAL_CAROUSEL_ITEMS[0], id: "clone-first" },
];

const getProductEmoji = (category: string) => {
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
};

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

export default function HomeScreen() {
  const { role } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("1");
  const [products, setProducts] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Initialize index tracking to 1 instead of 0 to skip past the cloned tail
  const [currentRealIndex, setCurrentRealIndex] = useState(0);
  const internalIndexRef = useRef(1);
  const flatListRef = useRef<FlatList>(null);
  const autoPlayTimerRef = useRef<JSX.Element | any>(null);

  const startAutoPlay = () => {
    stopAutoPlay();
    autoPlayTimerRef.current = setInterval(() => {
      const nextIndex = internalIndexRef.current + 1;
      flatListRef.current?.scrollToOffset({
        offset: nextIndex * ITEM_LENGTH,
        animated: true,
      });
      internalIndexRef.current = nextIndex;
    }, 3500);
  };

  const stopAutoPlay = () => {
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
    }
  };

  // Watch slide boundaries on continuous scrolling ticks to perform hidden snaps
  const handleScrollAction = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const preciseIndex = offsetX / ITEM_LENGTH;
    const roundedIndex = Math.round(preciseIndex);

    // Calculate indicator dots index state safely map to original data boundaries
    if (roundedIndex >= 1 && roundedIndex <= REAL_CAROUSEL_ITEMS.length) {
      setCurrentRealIndex(roundedIndex - 1);
    }

    // Loop correction thresholds
    if (preciseIndex <= 0.1) {
      // Invisible teleport snap to true last item when hitting cloned tail boundary
      const targetOffset = REAL_CAROUSEL_ITEMS.length * ITEM_LENGTH;
      flatListRef.current?.scrollToOffset({
        offset: targetOffset,
        animated: false,
      });
      internalIndexRef.current = REAL_CAROUSEL_ITEMS.length;
      setCurrentRealIndex(REAL_CAROUSEL_ITEMS.length - 1);
    } else if (preciseIndex >= REAL_CAROUSEL_ITEMS.length + 0.9) {
      // Invisible teleport snap to true first item when hitting cloned head boundary
      flatListRef.current?.scrollToOffset({
        offset: ITEM_LENGTH,
        animated: false,
      });
      internalIndexRef.current = 1;
      setCurrentRealIndex(0);
    } else {
      internalIndexRef.current = roundedIndex;
    }
  };

  useEffect(() => {
    if (!loading) {
      startAutoPlay();
    }
    return () => stopAutoPlay();
  }, [loading]);

  const fetchHomeData = async () => {
    try {
      if (!API_URL) return;
      const prodResponse = await fetch(`${API_URL}/api/products`);
      const prodData = await prodResponse.json();

      if (prodResponse.ok && Array.isArray(prodData)) {
        setProducts(prodData.slice(0, 6));
      }

      const userResponse = await fetch(`${API_URL}/api/users?role=farmer`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setFarmers(userData.slice(0, 4));
      } else {
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
    } catch (err) {
      console.error("Failed to load home data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHomeData();
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const filteredProducts = products.filter((item) => {
    const matchesSearch = item.name
      ?.toLowerCase()
      .includes(search.toLowerCase());
    if (activeCategory === "1") return matchesSearch;
    const targetCat = CATEGORIES.find(
      (c) => c.id === activeCategory,
    )?.label.toLowerCase();
    return matchesSearch && item.category?.toLowerCase() === targetCat;
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

          {/* Search Action */}
          <View className="px-5 mb-5">
            <SearchBar value={search} onChange={setSearch} />
          </View>

          {/* 🌟 TRUE CONTINUOUS INFINITE CAROUSEL SLIDER */}
          <View className="mb-6">
            <FlatList
              ref={flatListRef}
              data={SEAMLESS_CAROUSEL_DATA}
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
              keyExtractor={(item, index) => `${item.id}-${index}`}
            />

            {/* Custom Indicators referencing the real, active logical index mapping */}
            <View className="flex-row justify-center items-center mt-3 gap-1.5">
              {REAL_CAROUSEL_ITEMS.map((_, index) => (
                <View
                  key={index}
                  className={`rounded-full h-1.5 transition-all duration-200 ${currentRealIndex === index ? "w-5 bg-[#2D6A4F]" : "w-1.5 bg-[#D8F3DC]"}`}
                />
              ))}
            </View>
          </View>

          {/* CATEGORIES */}
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

          {/* FEATURED PRODUCE */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between px-5 mb-3">
              <Text className="text-[#1B4332] font-black text-[15px] tracking-tight">
                Featured Produce
              </Text>
              <TouchableOpacity onPress={() => router.push("/marketplace")}>
                <Text className="text-[#52B788] text-[13px] font-bold">
                  See all
                </Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color="#1B4332" className="my-10" />
            ) : filteredProducts.length === 0 ? (
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
                {filteredProducts.map((item) => (
                  <ProductCard key={item.id} item={item} router={router} />
                ))}
              </ScrollView>
            )}
          </View>

          {/* NEARBY FARMERS */}
          <View className="px-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[#1B4332] font-black text-[15px] tracking-tight">
                Nearby Farmers
              </Text>
              <TouchableOpacity>
                <Text className="text-[#52B788] text-[13px] font-bold">
                  See all
                </Text>
              </TouchableOpacity>
            </View>

            {farmers.map((farmer) => (
              <TouchableOpacity
                key={farmer.id}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: "/chat/room",
                    params: {
                      recipientId: farmer.id,
                      recipientName: farmer.full_name || farmer.name,
                    },
                  })
                }
                className="flex-row items-center bg-white rounded-2xl p-4 mb-3 border border-[#D8F3DC] shadow-sm"
              >
                <View className="w-12 h-12 rounded-xl bg-[#F0FAF4] items-center justify-center mr-3.5 border border-[#D8F3DC] overflow-hidden">
                  {farmer.profile_pic ? (
                    <Image
                      source={{ uri: farmer.profile_pic }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Text className="text-xl">👨‍🌾</Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-[#1B4332] font-black text-[14px]">
                    {farmer.full_name || farmer.name}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Feather
                      name="map-pin"
                      size={11}
                      color="#52B788"
                      style={{ marginRight: 3 }}
                    />
                    <Text className="text-[#95D5B2] text-xs font-bold">
                      {farmer.location || "Cameroon"}
                    </Text>
                  </View>
                </View>
                <View className="bg-[#F0FAF4] px-3 py-2 rounded-xl border border-[#D8F3DC] flex-row items-center gap-1">
                  <Feather name="message-circle" size={14} color="#2D6A4F" />
                  <Text className="text-[#2D6A4F] font-black text-xs uppercase tracking-wider">
                    Chat
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ProductCard({ item, router }: { item: any; router: any }) {
  const displayImageUri =
    item?.photos && item.photos.length > 0 ? item.photos[0] : null;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/marketplace/product/${item.id}`)}
      activeOpacity={0.85}
      className="w-40 rounded-[28px] p-2 mr-3.5 border border-[#D8F3DC] bg-white shadow-sm"
    >
      <View className="h-[110px] rounded-2xl items-center justify-center mb-2.5 bg-[#F0FAF4] overflow-hidden border border-[#E2F5E9]">
        {displayImageUri ? (
          <Image
            source={{ uri: displayImageUri }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <Text className="text-4xl">{getProductEmoji(item.category)}</Text>
        )}
      </View>
      <View className="px-1.5 pb-1">
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
          {item.farmer_name || "Verified Merchant"}
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
