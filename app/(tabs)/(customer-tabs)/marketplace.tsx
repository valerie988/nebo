import MessageFarmerButton from "@/components/MessageFarmerButton";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = Constants.expoConfig?.extra?.API_URL;
const CATEGORIES = ["All", "Veggies", "Fruits", "Grains", "Herbs", "Roots"];
const ITEMS_PER_PAGE = 3;

export default function MarketplaceScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products`);
      const data = await response.json();
      if (response.ok)
        setProducts(Array.isArray(data) ? data : data.products || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeCategory]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = (p?.name || "")
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchCat =
        activeCategory === "All" || p?.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [search, activeCategory, products]);

  // Pagination Slice
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  return (
    <View className="flex-1 bg-[#F8FDF9]">
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-4 pb-2">
          <Text className="text-[#1B4332] text-3xl font-black tracking-tighter">
            Marketplace
          </Text>
        </View>

        <View className="flex-row items-center bg-white rounded-2xl mx-5 px-4 h-14 my-4 border border-[#D8F3DC] shadow-sm">
          <Ionicons name="search" size={20} color="#52B788" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search food or farmers..."
            className="flex-1 ml-3 text-[#1B4332]"
          />
        </View>

        <View className="px-5 mb-4">
          <Text className="text-[#2D6A4F] text-[12px] font-black uppercase mb-2 tracking-widest">
            Filter by category
          </Text>
          <FlatList
            data={CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setActiveCategory(item)}
                className={`px-5 py-3 rounded-xl ${activeCategory === item ? "bg-[#1B4332]" : "bg-white border border-[#D8F3DC]"}`}
              >
                <Text
                  className={
                    activeCategory === item
                      ? "text-white font-bold"
                      : "text-[#1B4332] font-semibold"
                  }
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <View className="flex-1 px-5">
          {loading ? (
            <ActivityIndicator size="large" color="#1B4332" />
          ) : (
            <>
              <FlatList
                data={paginatedData}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={fetchProducts}
                  />
                }
                renderItem={({ item }) => (
                  <LargeProductCard item={item} router={router} />
                )}
                ListEmptyComponent={
                  <Text className="text-center mt-10 text-[#95D5B2]">
                    No products found.
                  </Text>
                }
              />

              {totalPages > 1 && (
                <View className="flex-row justify-center items-center gap-6 py-6 mb-4">
                  <TouchableOpacity
                    disabled={currentPage === 1}
                    onPress={() => setCurrentPage((c) => c - 1)}
                    className={`p-3 rounded-xl border ${currentPage === 1 ? "border-[#E2F5E9] bg-transparent" : "border-[#1B4332] bg-white"}`}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={24}
                      color={currentPage === 1 ? "#B7E4C7" : "#1B4332"}
                    />
                  </TouchableOpacity>

                  <Text className="text-[#1B4332] font-black text-lg">
                    {currentPage}{" "}
                    <Text className="text-[#B7E4C7]">/ {totalPages}</Text>
                  </Text>

                  <TouchableOpacity
                    disabled={currentPage === totalPages}
                    onPress={() => setCurrentPage((c) => c + 1)}
                    className={`p-3 rounded-xl border ${currentPage === totalPages ? "border-[#E2F5E9] bg-transparent" : "border-[#1B4332] bg-white"}`}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color={currentPage === totalPages ? "#B7E4C7" : "#1B4332"}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
function LargeProductCard({
  item,
  router,
}: {
  item: any;
  router: any;
}) {
  return (
    <View className="bg-white rounded-[28px] overflow-hidden mb-6 shadow-md border border-[#E9F5EF]">

      {/* Product Image */}
      <View className="relative">
        {item.photos?.[0] ? (
          <Image
            source={{ uri: item.photos[0] }}
            className="w-full h-56"
            resizeMode="cover"
          />
        ) : (
          <View className="h-56 bg-[#E9F5EF] items-center justify-center">
            <Text className="text-6xl">🥦</Text>
          </View>
        )}

        {/* Category Badge */}
        <View className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-full">
          <Text className="text-[#2D6A4F] font-semibold text-xs">
            {item.category || "Vegetables"}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View className="p-5">

        {/* Name & Price */}
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1 pr-3">
            <Text
              className="text-[#1B4332] text-xl font-extrabold"
              numberOfLines={1}
            >
              {item.name}
            </Text>

            <Text className="text-[#95A5A6] text-sm mt-1">
              By {item.farmer_name || item.farmer?.full_name || "Farmer"}
            </Text>
          </View>

          <View className="bg-[#F1FAF4] px-4 py-2 rounded-xl">
            <Text className="text-[#2D6A4F] font-black text-lg">
              {item.price}
            </Text>
            <Text className="text-[#52B788] text-xs text-center">
              XAF
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text
          className="text-[#6B7280] text-sm leading-5 mb-4"
          numberOfLines={2}
        >
          {item.description ||
            "Fresh, quality produce harvested directly from local farms."}
        </Text>

        {/* Buttons */}
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => router.push(`/product/${item.id}`)}
            className="flex-1 bg-[#1B4332] py-4 rounded-2xl items-center"
          >
            <Text className="text-white font-bold">
              View Details
            </Text>
          </TouchableOpacity>

          <MessageFarmerButton
            farmerId={item.farmer_id}
            farmerName={
              item.farmer_name ||
              item.farmer?.full_name ||
              "Farmer"
            }
    
          />
        </View>
      </View>
    </View>
  );
}