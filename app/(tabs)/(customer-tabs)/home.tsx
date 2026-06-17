import { useAuth } from "@/components/context/AuthContext";
import MessageFarmerButton from "@/components/MessageFarmerButton";
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const API_URL = Constants.expoConfig?.extra?.API_URL;
const SLIDE_WIDTH = SCREEN_WIDTH - 40;
const GAP = 16;
const ITEM_LENGTH = SLIDE_WIDTH + GAP;

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const FILTERS = [
  { id: "all", label: "All", icon: "grid-outline" as IoniconsName },
  { id: "nearby", label: "Nearby", icon: "location-outline" as IoniconsName },
  { id: "recommended", label: "For You", icon: "star-outline" as IoniconsName },
  { id: "popular", label: "Popular", icon: "flame-outline" as IoniconsName },
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

function getCategoryIcon(cat: string): IoniconsName {
  const map: Record<string, IoniconsName> = {
    veggies: "leaf-outline",
    fruits: "nutrition-outline",
    grains: "analytics-outline",
    herbs: "leaf-outline",
    roots: "beaker-outline",
  };
  return map[cat?.toLowerCase()] || "cube-outline";
}

function SafeFilterIcon({
  name,
  color,
}: {
  name: IoniconsName;
  color: string;
}) {
  try {
    return (
      <Ionicons
        name={name}
        size={16}
        color={color}
        style={{ marginRight: 6 }}
      />
    );
  } catch {
    return <View style={{ width: 16, height: 16, marginRight: 6 }} />;
  }
}

function MatchBadge({ label }: { label?: string }) {
  if (!label || label === "Explore") return null;
  const map: Record<string, { bg: string; text: string; icon: IoniconsName }> =
    {
      Nearby: { bg: "#D8F3DC", text: "#1B4332", icon: "location" },
      "Your Region": { bg: "#FEF3C7", text: "#92400E", icon: "map" },
      Recommended: { bg: "#EDE9FE", text: "#5B21B6", icon: "sparkles" },
      Popular: { bg: "#FEE2E2", text: "#991B1B", icon: "flame" },
      New: { bg: "#E0F2FE", text: "#075985", icon: "leaf" },
    };
  const c = map[label] || {
    bg: "#F1F5F9",
    text: "#475569",
    icon: "cube-outline" as IoniconsName,
  };
  return (
    <View
      style={{
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 99,
        backgroundColor: c.bg,
        alignSelf: "flex-start",
        marginBottom: 4,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      {c.icon ? (
        <Ionicons
          name={c.icon}
          size={10}
          color={c.text}
          style={{ marginRight: 3 }}
        />
      ) : null}
      <Text style={{ color: c.text, fontSize: 9, fontWeight: "700" }}>
        {label}
      </Text>
    </View>
  );
}

interface ProductCardProps {
  item: any;
  router: any;
  onPressCard: (id: string) => void;
}

function ProductCard({ item, router, onPressCard }: ProductCardProps) {
  const img = item?.image || item?.photos?.[0];
  const farmerName =
    item.farmer?.full_name || item.farmer?.name || "Verified Merchant";

  return (
    <TouchableOpacity
      onPress={() => onPressCard(item.id)}
      activeOpacity={0.85}
      style={{
        width: 160,
        borderRadius: 28,
        padding: 8,
        marginRight: 14,
        borderWidth: 1,
        borderColor: "#D8F3DC",
        backgroundColor: "#fff",
      }}
    >
      <View
        style={{
          height: 110,
          borderRadius: 16,
          marginBottom: 10,
          backgroundColor: "#F0FAF4",
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {img ? (
          <Image
            source={{ uri: img }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <Ionicons
            name={getCategoryIcon(item.category)}
            size={32}
            color="#52B788"
          />
        )}
      </View>
      <View style={{ paddingHorizontal: 6, paddingBottom: 4 }}>
        <MatchBadge label={item.match_label} />
        <Text
          style={{ color: "#1B4332", fontWeight: "800", fontSize: 13 }}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
            marginTop: 2,
          }}
        >
          <Text
            style={{
              color: "#52B788",
              fontSize: 11,
              fontWeight: "600",
              flexShrink: 1,
            }}
            numberOfLines={1}
          >
            {farmerName}
          </Text>
          {item.farmer?.is_verified && (
            <Ionicons name="checkmark-circle" size={11} color="#52B788" />
          )}
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 8,
            paddingTop: 4,
            borderTopWidth: 1,
            borderTopColor: "#F0FAF4",
          }}
        >
          <Text style={{ color: "#2D6A4F", fontWeight: "900", fontSize: 13 }}>
            {item.price?.toLocaleString()} XAF
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
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
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({
          offset: next * ITEM_LENGTH,
          animated: true,
        });
        internalIndexRef.current = next;
      }
    }, 3500);
  };

  const stopAutoPlay = () => {
    if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
  };

  const handleScroll = (e: any) => {
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

  const getToken = async () =>
    (await AsyncStorage.getItem("nebo_token")) ||
    (await AsyncStorage.getItem("access_token")) ||
    (await AsyncStorage.getItem("token"));

  const handleProductSelection = async (productId: string) => {
    try {
      const token = await getToken();
      fetch(`${API_URL}/api/recommendations/view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ product_id: productId }),
      });
    } catch (err) {
      console.warn("View tracking failed silently", err);
    }
    router.push(`/product/${productId}`);
  };

  const fetchProducts = async (filter: string, isRefresh = false) => {
    if (!API_URL) return;
    isRefresh
      ? setRefreshing(true)
      : filter === "all"
        ? setLoading(true)
        : setFilterLoading(true);

    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const url = `${API_URL}/api/recommendations/products?filter=${filter}&limit=20`;

      const res = await fetch(url, {
        headers: headers as Record<string, string>,
      });
      if (!res.ok) throw new Error(`${res.status}`);

      const data = await res.json();
      setAllProducts(data);

      if (data.length > 0 && filter === "nearby") {
        const nearbyCount = data.filter(
          (p: any) => p.match_label === "Nearby",
        ).length;
        setLocationLabel(
          nearbyCount > 0 ? `${nearbyCount} near you` : "In your region",
        );
      } else if (filter === "all") {
        setLocationLabel("");
      }
    } catch (err) {
      try {
        const res = await fetch(`${API_URL}/api/products?limit=20`);
        if (res.ok) setAllProducts(await res.json());
      } catch {}
    } finally {
      setLoading(false);
      setFilterLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFarmers = async () => {
    if (!API_URL) return;
    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(
        `${API_URL}/api/recommendations/farmers?limit=6`,
        {
          headers: headers as Record<string, string>,
        },
      );
      if (res.ok) {
        setFarmers(await res.json());
      } else {
        const fallbackRes = await fetch(`${API_URL}/api/users?role=farmer`);
        if (fallbackRes.ok) setFarmers((await fallbackRes.json()).slice(0, 6));
      }
    } catch {}
  };

  useEffect(() => {
    Promise.all([fetchProducts("all"), fetchFarmers()]);
  }, []);

  const handleFilterChange = (filterId: string) => {
    setActiveFilter(filterId);
    fetchProducts(filterId);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts(activeFilter, true);
    fetchFarmers();
  }, [activeFilter]);

  const displayed = useMemo(() => {
    return allProducts.filter((item) =>
      item.name?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [allProducts, search]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const filterLabel = () => {
    switch (activeFilter) {
      case "nearby":
        return locationLabel || "Near you";
      case "recommended":
        return "Picked for you";
      case "popular":
        return "Trending now";
      default:
        return "Fresh today";
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FDF9" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
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
          <View
            style={{
              paddingHorizontal: scale(16),
              paddingTop: 16,
              paddingBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Text
                  style={{ color: "#52B788", fontSize: 13, fontWeight: "900" }}
                >
                  {greeting.toUpperCase()}
                </Text>
                <Ionicons name="sunny" size={14} color="#FFB703" />
              </View>
              <Text
                style={{
                  color: "#1B4332",
                  fontSize: 24,
                  fontWeight: "900",
                  marginTop: 2,
                }}
              >
                What's fresh today?
              </Text>
              {(user?.location || locationLabel) && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 4,
                    gap: 4,
                  }}
                >
                  <Feather name="map-pin" size={11} color="#52B788" />
                  <Text
                    style={{
                      color: "#52B788",
                      fontSize: 11,
                      fontWeight: "600",
                    }}
                  >
                    {activeFilter === "nearby" && locationLabel
                      ? locationLabel
                      : user?.location || "Buea"}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/profile")}
              style={{
                width: 56,
                height: 56,
                borderRadius: 24,
                overflow: "hidden",
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: "#D8F3DC",
              }}
            >
              <Image
                source={require("@/assets/images/logo.png")}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: scale(16), marginBottom: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#F0FAF4",
                borderRadius: 16,
                paddingHorizontal: 16,
                height: 48,
                borderWidth: 1,
                borderColor: "#D8F3DC",
              }}
            >
              <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <Circle
                  cx="11"
                  cy="11"
                  r="7"
                  stroke="#2D6A4F"
                  strokeWidth="1.8"
                />
                <Path
                  d="M17 17L21 21"
                  stroke="#2D6A4F"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </Svg>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search fresh produce…"
                placeholderTextColor="#95D5B2"
                style={{
                  flex: 1,
                  marginLeft: 10,
                  color: "#1B4332",
                  fontSize: 15,
                  fontWeight: "500",
                }}
              />
            </View>
          </View>

          {/* Carousel */}
          <View style={{ marginBottom: 24 }}>
            <FlatList
              ref={flatListRef}
              data={SEAMLESS}
              horizontal
              pagingEnabled={false}
              snapToInterval={ITEM_LENGTH}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: scale(16) }}
              initialScrollIndex={1}
              getItemLayout={(_, i) => ({
                length: ITEM_LENGTH,
                offset: ITEM_LENGTH * i,
                index: i,
              })}
              onScroll={handleScroll}
              onScrollBeginDrag={stopAutoPlay}
              onScrollEndDrag={startAutoPlay}
              scrollEventThrottle={16}
              keyExtractor={(item, i) => `${item.id}-${i}`}
              renderItem={({ item }) => (
                <View
                  style={{
                    width: SLIDE_WIDTH,
                    marginRight: GAP,
                    height: 160,
                    borderRadius: 28,
                    overflow: "hidden",
                    backgroundColor: "#2D6A4F",
                  }}
                >
                  <Image
                    source={{ uri: item.image }}
                    style={{
                      width: "100%",
                      height: "100%",
                      position: "absolute",
                    }}
                    resizeMode="cover"
                  />
                  <View
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundColor: "rgba(0,0,0,0.4)",
                      padding: 24,
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.8)",
                        fontSize: 10,
                        fontWeight: "900",
                        letterSpacing: 2,
                        marginBottom: 4,
                      }}
                    >
                      {item.subtitle}
                    </Text>
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 20,
                        fontWeight: "900",
                        lineHeight: 24,
                      }}
                    >
                      {item.title}
                    </Text>
                  </View>
                </View>
              )}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                marginTop: 12,
                gap: 6,
              }}
            >
              {CAROUSEL.map((_, i) => (
                <View
                  key={i}
                  style={{
                    borderRadius: 99,
                    height: 6,
                    width: currentRealIndex === i ? 20 : 6,
                    backgroundColor:
                      currentRealIndex === i ? "#2D6A4F" : "#D8F3DC",
                  }}
                />
              ))}
            </View>
          </View>

          {/* Filter tabs */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                color: "#1B4332",
                fontWeight: "900",
                fontSize: 15,
                paddingHorizontal: scale(16),
                marginBottom: 12,
              }}
            >
              Browse
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: scale(16) }}
            >
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => handleFilterChange(f.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderRadius: 99,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    marginRight: 10,
                    borderWidth: 1,
                    backgroundColor: activeFilter === f.id ? "#2D6A4F" : "#fff",
                    borderColor: activeFilter === f.id ? "#2D6A4F" : "#D8F3DC",
                  }}
                >
                  <SafeFilterIcon
                    name={f.icon}
                    color={activeFilter === f.id ? "white" : "#2D6A4F"}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: activeFilter === f.id ? "#fff" : "#2D6A4F",
                    }}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Featured Produce */}
          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: scale(16),
                marginBottom: 12,
              }}
            >
              <View>
                <Text
                  style={{ color: "#1B4332", fontWeight: "900", fontSize: 15 }}
                >
                  Featured Produce
                </Text>
                <Text
                  style={{
                    color: "#52B788",
                    fontSize: 11,
                    fontWeight: "600",
                    marginTop: 2,
                  }}
                >
                  {filterLabel()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/marketplace")}>
                <Text
                  style={{ color: "#52B788", fontSize: 13, fontWeight: "700" }}
                >
                  See all
                </Text>
              </TouchableOpacity>
            </View>

            {loading || filterLoading ? (
              <ActivityIndicator
                color="#1B4332"
                style={{ marginVertical: 40 }}
              />
            ) : displayed.length === 0 ? (
              <View
                style={{
                  marginHorizontal: 20,
                  backgroundColor: "#F0FAF4",
                  borderRadius: 16,
                  padding: 32,
                  alignItems: "center",
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: "#D8F3DC",
                }}
              >
                <Ionicons
                  name="leaf-outline"
                  size={24}
                  color="#2D6A4F"
                  style={{ marginBottom: 4 }}
                />
                <Text
                  style={{
                    color: "#2D6A4F",
                    fontSize: 12,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  {activeFilter === "nearby"
                    ? "No produce found in your region yet.\nTry 'All' to see everything."
                    : "No produce matches this filter yet."}
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: scale(16) }}
              >
                {displayed.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    router={router}
                    onPressCard={handleProductSelection}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          {/* Nearby Farmers */}
          <View style={{ paddingHorizontal: scale(16) }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <View>
                <Text
                  style={{ color: "#1B4332", fontWeight: "900", fontSize: 15 }}
                >
                  Nearby Farmers
                </Text>
                <Text
                  style={{
                    color: "#52B788",
                    fontSize: 11,
                    fontWeight: "600",
                    marginTop: 2,
                  }}
                >
                  📍 Region: {user?.location || "Buea"}
                </Text>
              </View>
              <TouchableOpacity>
                <Text
                  style={{ color: "#52B788", fontSize: 13, fontWeight: "700" }}
                >
                  See all
                </Text>
              </TouchableOpacity>
            </View>

            {farmers.length === 0 ? (
              <View
                style={{
                  backgroundColor: "#F0FAF4",
                  borderRadius: 16,
                  padding: 20,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#95D5B2", fontSize: 13 }}>
                  No regional merchants listed yet
                </Text>
              </View>
            ) : (
              farmers.map((farmer) => {
                const farmerName = farmer.full_name || farmer.name || "Farmer";
                return (
                  <View
                    key={farmer.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#fff",
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: "#D8F3DC",
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: "#F0FAF4",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 14,
                        borderWidth: 1,
                        borderColor: "#D8F3DC",
                        overflow: "hidden",
                      }}
                    >
                      {farmer.avatar_url || farmer.profile_pic ? (
                        <Image
                          source={{
                            uri: farmer.avatar_url || farmer.profile_pic,
                          }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons
                          name="person-outline"
                          size={24}
                          color="#1B7344"
                        />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: "#1B4332",
                            fontWeight: "900",
                            fontSize: 14,
                          }}
                        >
                          {farmerName}
                        </Text>
                        {farmer.is_verified && (
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color="#1B7344"
                          />
                        )}
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 2,
                          gap: 4,
                        }}
                      >
                        <Feather name="map-pin" size={11} color="#52B788" />
                        <Text
                          style={{
                            color: "#95D5B2",
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          {farmer.location || "Cameroon"}
                        </Text>
                      </View>
                      {farmer.match_label && (
                        <MatchBadge label={farmer.match_label} />
                      )}
                      {farmer.product_count > 0 && (
                        <Text
                          style={{
                            color: "#52B788",
                            fontSize: 10,
                            marginTop: 4,
                            fontWeight: "600",
                          }}
                        >
                          {farmer.product_count} product
                          {farmer.product_count !== 1 ? "s" : ""} listed
                        </Text>
                      )}
                    </View>
                    <MessageFarmerButton
                      farmerId={farmer.id}
                      farmerName={farmerName}
                      farmerPhone={farmer.phone}
                    />
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
