import { useRouter } from "expo-router";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Dimensions,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 40 - 15) / 2;
const CATEGORIES = ["All", "Veggies", "Fruits", "Grains", "Herbs", "Roots"];
const API_URL = "http://172.20.10.2:8000";

export default function MarketplaceScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/products/`);
      const data = await response.json();
      if (response.ok) setProducts(data);
    }  finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, []);

  const filtered = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    return list.filter((p) => {
      const matchSearch = (p?.name || "").toLowerCase().includes(search.toLowerCase()) || 
                          (p?.farmer_name || "").toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === "All" || p?.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [search, activeCategory, products]);

  if (loading) {
    return <View className="flex-1 items-center justify-center bg-[#F8FDF9]"><ActivityIndicator size="large" color="#1B4332" /></View>;
  }

  return (
    <View className="flex-1 bg-[#F8FDF9]">
      <SafeAreaView className="flex-1">
        {/* Header Section */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-[#1B4332] text-3xl font-black tracking-tighter">Marketplace</Text>
          <Text className="text-[#52B788] text-sm font-medium">Find fresh food from the farm</Text>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-white rounded-2xl mx-5 px-4 h-14 my-4 border border-[#D8F3DC] shadow-sm">
          <Text className="text-xl mr-2">🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search food or farmers..."
            placeholderTextColor="#B7E4C7"
            className="flex-1 text-[#1B4332] text-base"
          />
        </View>

        {/* Categories Bar */}
        <View className="mb-4">
          <FlatList
            data={CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setActiveCategory(item)}
                className={`rounded-full px-5 py-2.5 ${activeCategory === item ? "bg-[#1B4332]" : "bg-white border border-[#D8F3DC]"}`}
              >
                <Text className={`font-bold ${activeCategory === item ? "text-white" : "text-[#1B4332]"}`}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Product Grid */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={{ width: COLUMN_WIDTH }} className={`bg-white rounded-3xl p-3 mb-4 border border-[#D8F3DC] shadow-sm ${item.stock <= 0 ? "opacity-60" : ""}`}>
              <TouchableOpacity onPress={() => router.push(`/product/${item.id}`)}>
                <View className="h-32 w-full rounded-2xl bg-[#F0FAF4] items-center justify-center mb-3">
                  <Text className="text-6xl">{item.emoji || "📦"}</Text>
                  {item.stock <= 0 && (
                    <View className="absolute bg-red-500 px-3 py-1 rounded-full"><Text className="text-white text-[10px] font-bold uppercase">Finished</Text></View>
                  )}
                </View>
                <Text className="text-[#1B4332] font-bold text-lg leading-5 mb-1" numberOfLines={1}>{item.name}</Text>
                <Text className="text-[#2D6A4F] font-black text-lg">{item.price} <Text className="text-[#95D5B2] text-[10px]">XAF</Text></Text>
              </TouchableOpacity>

              <View className="flex-row gap-2 mt-4">
                <TouchableOpacity 
                  onPress={() => router.push({ pathname: "/chat", params: { farmerId: item.id, farmerName: item.farmer_name }})}
                  className="flex-1 border border-[#52B788] py-2 rounded-xl items-center justify-center"
                >
                  <Text className="text-[#2D6A4F] font-bold text-[10px]">Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => router.push(`/product/${item.id}`)}
                  className="flex-1 bg-[#1B4332] py-2 rounded-xl items-center justify-center"
                >
                  <Text className="text-white font-bold text-[10px]">View</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </SafeAreaView>
    </View>
  );
}