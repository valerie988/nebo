import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const API_URL =
  Constants.expoConfig?.extra?.API_URL || "http://172.20.10.2:8000";

// 🌿 Aligned with your AddProductScreen categories for seamless filtering
const CATEGORIES = [
  "All",
  "Veggies",
  "Fruits",
  "Grains",
  "Herbs",
  "Roots",
  "Dairy",
  "Other",
];

export default function FarmerInventoryScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const fetchMyProducts = async () => {
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

  useEffect(() => {
    fetchMyProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((item: any) => {
      const itemName = item?.name ? item.name.toLowerCase() : "";
      const matchesSearch = itemName.includes(searchQuery.toLowerCase());

      // Normalizing variations like 'Veggies' vs 'Vegetables' if any discrepancy exists
      const itemCategory =
        item?.category === "Veggies" ? "Veggies" : item?.category;
      const matchesCategory =
        activeCategory === "All" || itemCategory === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory, products]);

  const handleDelete = (id: string) => {
    Alert.alert("Delete Product", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token =
              (await AsyncStorage.getItem("nebo_token")) ||
              (await AsyncStorage.getItem("token"));
            await fetch(`${API_URL}/api/products/${id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            setProducts(products.filter((p: any) => p.id !== id));
          } catch (e) {
            console.error("Failed to delete item:", e);
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-[#F8FDF9]">
      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        {/* Header */}
        <View className="px-6 pt-4 pb-2 flex-row justify-between items-center">
          <View>
            <Text className="text-[#1B4332] text-3xl font-black tracking-tighter">
              My Store
            </Text>
            <Text className="text-[#52B788] text-xs font-bold">
              {products.length} Products listed
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/(farmer-tabs)/addProduct")}
            className="bg-[#1B4332] w-12 h-12 rounded-2xl items-center justify-center shadow-md border border-[#2D6A4F]"
          >
            <Feather name="plus" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="px-6 mt-4">
          <View className="flex-row items-center bg-white border border-[#D8F3DC] rounded-2xl px-4 py-3 shadow-sm">
            <Feather name="search" size={18} color="#95D5B2" />
            <TextInput
              placeholder="Search my products..."
              placeholderTextColor="#95D5B2"
              className="flex-1 ml-3 text-[#1B4332] font-semibold"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== "" && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Feather name="x-circle" size={18} color="#95D5B2" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Categories Scroller */}
        <View className="mt-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24 }}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className={`mr-3 px-5 py-2.5 rounded-full border ${
                  activeCategory === cat
                    ? "bg-[#1B4332] border-[#1B4332]"
                    : "bg-white border-[#D8F3DC]"
                }`}
              >
                <Text
                  className={`font-black text-xs ${activeCategory === cat ? "text-white" : "text-[#1B4332]"}`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator color="#1B4332" className="mt-10" />
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => `${item.id || item._id}`}
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingVertical: 20,
              paddingBottom: 40,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={fetchMyProducts}
              />
            }
            renderItem={({ item }) => (
              <InventoryCard
                item={item}
                onEdit={() =>
                  router.push({
                    pathname: "/farmer/edit-product",
                    params: {
                      id: item.id || item._id,
                      name: item.name,
                      price: item?.price ? item.price.toString() : "0",
                      quantity: item?.quantity ? item.quantity.toString() : "0",
                      category: item.category,
                      unit: item.unit,
                      description: item.description || "",
                      location: item.location || "",
                    },
                  })
                }
                onDelete={handleDelete}
              />
            )}
            ListEmptyComponent={
              <View className="items-center mt-20 px-10">
                <View className="w-16 h-16 rounded-full bg-[#F0FAF4] items-center justify-center mb-4 border border-[#D8F3DC]">
                  <Feather name="archive" size={28} color="#2D6A4F" />
                </View>
                <Text className="text-[#1B4332] font-black text-center text-base">
                  {searchQuery ? "No results found" : "Your store is empty"}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function InventoryCard({ item, onEdit, onDelete }: any) {
  const isLowStock = item?.quantity < 5;

  // 🌟 Clean implementation fixing single string payloads vs array structures
  const displayImageUri = useMemo(() => {
    let originalUrl = null;

    if (item?.image) {
      originalUrl = item.image; // Extracted from payload key payload.image
    } else if (item?.photos && item.photos.length > 0) {
      originalUrl = item.photos[0]; // Extracted via alternate array naming schemes
    }

    if (originalUrl && typeof originalUrl === "string") {
      if (originalUrl.includes("/upload/")) {
        return originalUrl.replace(
          "/upload/",
          "/upload/w_200,h_200,c_fill,q_auto/",
        );
      }
      return originalUrl;
    }
    return null;
  }, [item?.image, item?.photos]);

  return (
    <View className="bg-white rounded-3xl p-4 mb-4 border border-[#D8F3DC] shadow-sm flex-row items-center">
      {/* 📸 Image Box wrapper */}
      <View className="h-20 w-20 rounded-2xl bg-[#F0FAF4] items-center justify-center border border-[#EAF7EE] relative overflow-hidden">
        {displayImageUri ? (
          <Image
            source={{ uri: displayImageUri }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <Feather name="package" size={26} color="#52B788" />
        )}

        {isLowStock && (
          <View className="absolute top-1 left-1 bg-amber-500 rounded-full p-1 z-10 shadow-sm">
            <View className="w-1.5 h-1.5 bg-white rounded-full" />
          </View>
        )}
      </View>

      <View className="flex-1 pl-4 pr-2">
        <Text
          className="text-[#1B4332] font-black text-[15px]"
          numberOfLines={1}
        >
          {item?.name}
        </Text>
        <Text className="text-[#2D6A4F] font-extrabold text-[14px] mt-0.5">
          {item?.price} XAF
        </Text>
        <Text className="text-[#95D5B2] font-bold text-[11px] mt-1 uppercase tracking-wide">
          Stock: {item?.quantity} {item?.unit || "kg"}
        </Text>
      </View>

      <View className="flex-col justify-between h-20 justify-center">
        <TouchableOpacity
          onPress={onEdit}
          className="bg-[#F0FAF4] p-2 rounded-xl border border-[#D8F3DC]"
        >
          <Feather name="edit-2" size={14} color="#1B7344" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete(item.id || item._id)}
          className="bg-red-50 p-2 rounded-xl border border-red-100 mt-2"
        >
          <Feather name="trash-2" size={14} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
