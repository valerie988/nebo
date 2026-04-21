import { useState, useEffect, useMemo } from "react";
import {
  Dimensions,
  FlatList,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 40 - 15) / 2;
const API_URL = "http://172.20.10.2:8000";

const CATEGORIES = ["All", "Vegetables", "Fruits", "Grains", "Tubers", "Poultry"];

export default function FarmerInventoryScreen() {
  const router = useRouter();
const [products, setProducts] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const fetchMyProducts = async () => {
    try {
      const token = await AsyncStorage.getItem("nebo_token");
      const response = await fetch(`${API_URL}/products/my`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setProducts(data);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchMyProducts(); }, []);

  // Filter Logic
  const filteredProducts = useMemo(() => {
    return products.filter((item: any) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
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
          const token = await AsyncStorage.getItem("nebo_token");
          await fetch(`${API_URL}/products/${id}`, { 
            method: 'DELETE',
            headers: { "Authorization": `Bearer ${token}` }
          });
          setProducts(products.filter((p: any) => p.id !== id));
        } 
      },
    ]);
  };

  return (
    <View className="flex-1 bg-[#F8FDF9]">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-6 pt-4 pb-2 flex-row justify-between items-center">
          <View>
            <Text className="text-[#1B4332] text-3xl font-black tracking-tighter">My Store</Text>
            <Text className="text-[#52B788] text-xs font-bold">{products.length} Products listed</Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push("/(tabs)/(farmer-tabs)/addProduct")}
            className="bg-[#1B4332] w-12 h-12 rounded-2xl items-center justify-center shadow-lg"
          >
            <Ionicons name="add" size={30} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="px-6 mt-4">
          <View className="flex-row items-center bg-white border border-[#D8F3DC] rounded-2xl px-4 py-3 shadow-sm">
            <Ionicons name="search" size={20} color="#95D5B2" />
            <TextInput
              placeholder="Search my products..."
              className="flex-1 ml-3 text-[#1B4332] font-semibold"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== "" && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#95D5B2" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Selector */}
        <View className="mt-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className={`mr-3 px-5 py-2.5 rounded-full border ${
                  activeCategory === cat ? "bg-[#1B4332] border-[#1B4332]" : "bg-white border-[#D8F3DC]"
                }`}
              >
                <Text className={`font-black text-xs ${activeCategory === cat ? "text-white" : "text-[#1B4332]"}`}>
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
            numColumns={2}
            keyExtractor={(item) => `${item.id}`}
            columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 24 }}
            contentContainerStyle={{ paddingVertical: 20, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchMyProducts} />}
            renderItem={({ item }) => (
              <InventoryCard 
                item={item} 
                onEdit={() => router.push({
                   pathname: "/farmer/edit-product",
                   params: { 
                     id: item.id, 
                     name: item.name, 
                     price: item.price.toString(),
                     quantity: item.quantity.toString(),
                     category: item.category,
                     unit: item.unit
                   }
                })} 
                onDelete={handleDelete} 
              />
            )}
            ListEmptyComponent={
              <View className="items-center mt-20 px-10">
                <Text className="text-5xl mb-4">{searchQuery ? "🔍" : "🚜"}</Text>
                <Text className="text-[#1B4332] font-black text-center text-lg">
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

// Keep your InventoryCard as it was, but use standard navigation for the edit button
function InventoryCard({ item, onEdit, onDelete }: any) {
  const isLowStock = item?.quantity < 5;
  return (
    <View style={{ width: COLUMN_WIDTH }} className="bg-white rounded-[30px] p-3 mb-4 border border-[#D8F3DC] shadow-sm">
      <View className="h-28 w-full rounded-[22px] bg-[#F0FAF4] items-center justify-center mb-3">
         {/* Display the first photo from the photos list if it exists, otherwise emoji */}
        <Text className="text-4xl">{item?.photos?.[0] ? "🖼️" : "📦"}</Text>
        {isLowStock && (
          <View className="absolute top-2 right-2 bg-amber-500 px-2 py-0.5 rounded-full">
            <Text className="text-white text-[8px] font-black uppercase">Low Stock</Text>
          </View>
        )}
      </View>
      <View className="px-1">
        <Text className="text-[#1B4332] font-black text-sm mb-1" numberOfLines={1}>{item?.name}</Text>
        <Text className="text-[#2D6A4F] font-bold text-xs">{item?.price} XAF</Text>
        <Text className="text-[#95D5B2] text-[10px] mb-3">{item?.quantity} {item?.unit}</Text>
        <View className="flex-row justify-between border-t border-[#F0FAF4] pt-3">
          <TouchableOpacity onPress={onEdit} className="bg-[#F0FAF4] p-2 rounded-full">
            <Ionicons name="create-outline" size={18} color="#1B7344" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(item.id)} className="bg-red-50 p-2 rounded-full">
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}