import React, { useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// --- Constants & Data ---
const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 40 - 15) / 2;
const CATEGORIES = ["All", "Veggies", "Fruits", "Grains", "Herbs", "Roots"];

const PRODUCTS = [
  { id: "1", name: "Roma Tomatoes", farmer: "Nkomo Farm", price: 500, unit: "kg", emoji: "🍅", category: "Veggies", inStock: true, phone: "+237600000000" },
  { id: "2", name: "Sweet Plantains", farmer: "Green Valley", price: 300, unit: "bunch", emoji: "🍌", category: "Fruits", inStock: true, phone: "+237600000000" },
  { id: "3", name: "Spinach Leaves", farmer: "Fokou Fields", price: 250, unit: "bunch", emoji: "🥬", category: "Veggies", inStock: true, phone: "+237600000000" },
  { id: "4", name: "Organic Carrots", farmer: "Biya Roots", price: 400, unit: "kg", emoji: "🥕", category: "Roots", inStock: false, phone: "+237600000000" },
  { id: "5", name: "Fresh Ginger", farmer: "Ngozi Herbs", price: 600, unit: "kg", emoji: "🫚", category: "Herbs", inStock: true, phone: "+237600000000" },
  { id: "6", name: "Corn Cobs", farmer: "Savanna Fields", price: 150, unit: "cob", emoji: "🌽", category: "Grains", inStock: true, phone: "+237600000000" },
];

// --- Shared Components ---

function ProductCard({ item, onView }: { item: typeof PRODUCTS[0], onView: (p: typeof PRODUCTS[0]) => void }) {
  return (
    <View
      style={{ width: COLUMN_WIDTH }}
      className={`bg-white rounded-3xl p-3 mb-4 border border-[#D8F3DC] shadow-sm ${!item.inStock ? "opacity-60" : ""}`}
    >
      <View className="h-32 w-full rounded-2xl bg-[#F0FAF4] items-center justify-center mb-3">
        <Text className="text-6xl">{item.emoji}</Text>
        {!item.inStock && (
          <View className="absolute bg-red-500 px-3 py-1 rounded-full">
            <Text className="text-white text-[10px] font-bold uppercase">Finished</Text>
          </View>
        )}
      </View>

      <View className="px-1">
        <Text className="text-[#1B4332] font-bold text-lg leading-5 mb-1" numberOfLines={1}>
          {item.name}
        </Text>

        <View className="flex-row items-baseline">
          <Text className="text-[#2D6A4F] font-black text-lg">{item.price}</Text>
          <Text className="text-[#95D5B2] text-[10px] ml-1">XAF/{item.unit}</Text>
        </View>

        <View className="flex-row gap-2 mt-4">
          <TouchableOpacity 
            onPress={() => Linking.openURL(`tel:${item.phone}`)}
            className="flex-1 border border-[#52B788] py-2 rounded-xl items-center justify-center"
          >
            <Text className="text-[#2D6A4F] font-bold text-[10px]">Contact</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => onView(item)}
            className="flex-1 bg-[#1B4332] py-2 rounded-xl items-center justify-center"
          >
            <Text className="text-white font-bold text-[10px]">View</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// --- Main Marketplace Screen ---

export default function MarketplaceScreen() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState<typeof PRODUCTS[0] | null>(null);

  const filtered = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.farmer.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === "All" || p.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [search, activeCategory]);

  // If a product is selected, show the Details View
  if (selectedProduct) {
    return (
      <View className="flex-1 bg-white">
        <SafeAreaView className="flex-1">
          <View className="px-5 py-4 flex-row items-center justify-between">
            <TouchableOpacity 
              onPress={() => setSelectedProduct(null)} 
              className="bg-[#F0FAF4] p-3 rounded-2xl"
            >
              <Text className="text-[#1B4332] font-bold">← Back</Text>
            </TouchableOpacity>
            <Text className="text-[#1B4332] font-bold text-lg">Product Details</Text>
            <View className="w-10" />
          </View>

          <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
            <View className="h-64 w-full bg-[#F0FAF4] rounded-[40px] items-center justify-center my-6">
              <Text className="text-9xl">{selectedProduct.emoji}</Text>
            </View>

            <View className="flex-row justify-between items-start">
              <View className="flex-1 mr-4">
                <Text className="text-3xl font-black text-[#1B4332]">{selectedProduct.name}</Text>
                <Text className="text-[#52B788] text-lg font-medium">By {selectedProduct.farmer}</Text>
              </View>
              <View className="bg-[#D8F3DC] px-4 py-2 rounded-2xl">
                <Text className="text-[#1B4332] font-bold text-xl">{selectedProduct.price}</Text>
                <Text className="text-[#1B4332] text-[10px] text-center">XAF</Text>
              </View>
            </View>

            <View className="mt-8">
              <Text className="text-[#1B4332] font-bold text-xl mb-2">About this product</Text>
              <Text className="text-[#2D6A4F] leading-6 text-base">
                Freshly harvested {selectedProduct.name.toLowerCase()} sourced directly from {selectedProduct.farmer}. 
                Ensuring quality and supporting local agriculture.
              </Text>
            </View>

            <View className="bg-[#F0FAF4] p-5 rounded-3xl mt-8 flex-row items-center justify-between">
              <View>
                <Text className="text-[#1B4332] font-bold text-lg">Availability</Text>
                <Text className="text-[#52B788]">Sold per {selectedProduct.unit}</Text>
              </View>
              <Text className="text-3xl">{selectedProduct.inStock ? "✅" : "❌"}</Text>
            </View>
            
            <View className="h-10" />
          </ScrollView>

          <View className="p-5 border-t border-[#D8F3DC]">
            <TouchableOpacity 
              className="bg-[#1B4332] w-full py-5 rounded-2xl items-center"
              onPress={() => Linking.openURL(`tel:${selectedProduct.phone}`)}
            >
              <Text className="text-white font-bold text-lg">Contact Buyer Now</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Otherwise, show the Grid View (Marketplace)
  return (
    <View className="flex-1 bg-[#F8FDF9]">
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-4 pb-2">
          <Text className="text-[#1B4332] text-3xl font-black tracking-tighter">Marketplace</Text>
          <Text className="text-[#52B788] text-sm font-medium">Find fresh food from the farm</Text>
        </View>

        <View className="flex-row items-center bg-white rounded-2xl mx-5 px-4 h-14 my-4 border border-[#D8F3DC]">
          <Text className="text-xl mr-2">🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search food or farmers..."
            placeholderTextColor="#B7E4C7"
            className="flex-1 text-[#1B4332] text-base"
          />
        </View>

        <View className="mb-4">
          <FlatList
            data={CATEGORIES}
            keyExtractor={(item) => item}
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

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Text className="text-6xl mb-4">🤷‍♀️</Text>
              <Text className="text-[#1B4332] font-bold text-lg">No products found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ProductCard 
              item={item} 
              onView={(p) => setSelectedProduct(p)} 
            />
          )}
        />
      </SafeAreaView>
    </View>
  );
}