import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Dimensions,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 40 - 15) / 2; 
const CATEGORIES = ["All", "Veggies", "Fruits", "Grains", "Herbs", "Roots"];
const API_URL = "http://172.20.10.2:8000"; // Update to your Mac's IP

// ─── 3 Static Items (Fallback) ──────────────────────────────────────────
const STATIC_PRODUCTS = [
  {
    id: "s1",
    name: "Roma Tomatoes",
    farmer: "Nkomo Farm",
    price: 500,
    unit: "kg",
    emoji: "🍅",
    category: "Veggies",
    inStock: true,
  },
  {
    id: "s2",
    name: "Sweet Plantains",
    farmer: "Green Valley",
    price: 300,
    unit: "bunch",
    emoji: "🍌",
    category: "Fruits",
    inStock: true,
  },
  
];

function ProductCard({ item }: { item: any }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={{ width: COLUMN_WIDTH }}
      className={`bg-white rounded-[30px] p-3 mb-4 border border-[#D8F3DC] shadow-sm ${!item.in_stock && item.id.length > 5 ? "opacity-60" : ""}`}
    >
      <View className="h-32 w-full rounded-[22px] bg-[#F0FAF4] items-center justify-center mb-3">
        {/* If backend provides a photo URL, you'd use <Image />, otherwise emoji */}
        <Text className="text-5xl">{item.emoji || "📦"}</Text>

        {item.in_stock === false && (
          <View className="absolute bg-red-500 px-3 py-1 rounded-full">
            <Text className="text-white text-[10px] font-black uppercase">Sold Out</Text>
          </View>
        )}
      </View>

      <View className="px-1">
        <Text className="text-[#1B4332] font-black text-[15px] leading-5 mb-1" numberOfLines={1}>
          {item.name}
        </Text>

        <View className="flex-row items-baseline">
          <Text className="text-[#2D6A4F] font-black text-lg">{item.price}</Text>
          <Text className="text-[#95D5B2] text-[10px] ml-1 font-bold">XAF/{item.unit}</Text>
        </View>

        <Text className="text-[#52B788] text-[11px] mt-1 font-medium" numberOfLines={1}>
          By {item.farmer_name || item.farmer || "Local Farmer"}
        </Text>

        <View className="mt-3 bg-[#F0FAF4] py-2.5 rounded-2xl items-center border border-[#D8F3DC]">
          <Text className="text-[#1B7344] font-black text-[10px] uppercase tracking-widest">View Details</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MarketplaceScreen() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [backendProducts, setBackendProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Fetch from Backend
  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/products/`);
      if (response.ok) {
        const data = await response.json();
        setBackendProducts(data);
      }
    } catch (error) {
      console.log("Fetch error (showing statics instead):", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, []);

  // 2. Merge Static + Backend & Filter
  const allProducts = useMemo(() => {
    return [...STATIC_PRODUCTS, ...backendProducts];
  }, [backendProducts]);

  const filtered = useMemo(() => {
    return allProducts.filter((p) => {
      const matchSearch =
        search.trim() === "" ||
        p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat =
        activeCategory === "All" || p.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [search, activeCategory, allProducts]);

  return (
    <View className="flex-1 bg-[#F8FDF9]">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <Text className="text-[#1B4332] text-4xl font-black tracking-tighter">NeBo</Text>
          <Text className="text-[#52B788] text-sm font-bold">Marketplace</Text>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-white rounded-2xl mx-6 px-4 h-14 my-4 border border-[#D8F3DC] shadow-sm">
          <Text className="text-xl mr-2">🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="What are you looking for?"
            placeholderTextColor="#B7E4C7"
            className="flex-1 text-[#1B4332] font-semibold"
          />
        </View>

        {/* Categories */}
        <View className="mb-4">
          <FlatList
            data={CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setActiveCategory(item)}
                className={`rounded-full px-6 py-3 ${
                  activeCategory === item ? "bg-[#1B4332]" : "bg-white border border-[#D8F3DC]"
                }`}
              >
                <Text className={`font-black text-xs uppercase tracking-widest ${activeCategory === item ? "text-white" : "text-[#1B4332]"}`}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* List */}
        {loading && backendProducts.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator color="#1B4332" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 24 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B4332" />
            }
            renderItem={({ item }) => <ProductCard item={item} />}
            ListEmptyComponent={
              <View className="items-center mt-20">
                <Text className="text-4xl mb-2">🌿</Text>
                <Text className="text-[#1B4332] font-black">No products found</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}