
import { useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 40 - 15) / 2; 
const CATEGORIES = ["All", "Veggies", "Fruits", "Grains", "Herbs", "Roots"];

const PRODUCTS = [
  {
    id: "1",
    name: "Roma Tomatoes",
    farmer: "Nkomo Farm",
    price: 500,
    unit: "kg",
    emoji: "🍅",
    category: "Veggies",
    inStock: true,
  },
  {
    id: "2",
    name: "Sweet Plantains",
    farmer: "Green Valley",
    price: 300,
    unit: "bunch",
    emoji: "🍌",
    category: "Fruits",
    inStock: true,
  },
  {
    id: "3",
    name: "Spinach Leaves",
    farmer: "Fokou Fields",
    price: 250,
    unit: "bunch",
    emoji: "🥬",
    category: "Veggies",
    inStock: true,
  },
  {
    id: "4",
    name: "Organic Carrots",
    farmer: "Biya Roots",
    price: 400,
    unit: "kg",
    emoji: "🥕",
    category: "Roots",
    inStock: false,
  },
  {
    id: "5",
    name: "Fresh Ginger",
    farmer: "Ngozi Herbs",
    price: 600,
    unit: "kg",
    emoji: "🫚",
    category: "Herbs",
    inStock: true,
  },
  {
    id: "6",
    name: "Corn Cobs",
    farmer: "Savanna Fields",
    price: 150,
    unit: "cob",
    emoji: "🌽",
    category: "Grains",
    inStock: true,
  },
];

// Product Card (Visual Grid Style) 
function ProductCard({ item }: { item: (typeof PRODUCTS)[0] }) {


  return (
    <TouchableOpacity
      activeOpacity={0.9}
     
      style={{ width: COLUMN_WIDTH }}
      className={`bg-white rounded-3xl p-3 mb-4 border border-[#D8F3DC] shadow-sm ${!item.inStock ? "opacity-60" : ""}`}
    >
      {/* Big Visual Image */}
      <View className="h-32 w-full rounded-2xl bg-[#F0FAF4] items-center justify-center mb-3">
        <Text className="text-6xl">{item.emoji}</Text>

        {!item.inStock && (
          <View className="absolute bg-red-500 px-3 py-1 rounded-full">
            <Text className="text-white text-[10px] font-bold uppercase">
              Finished
            </Text>
          </View>
        )}
      </View>

      {/* Product Info - Big and Clear */}
      <View className="px-1">
        <Text
          className="text-[#1B4332] font-bold text-lg leading-5 mb-1"
          numberOfLines={1}
        >
          {item.name}
        </Text>

        <View className="flex-row items-baseline">
          <Text className="text-[#2D6A4F] font-black text-lg">
            {item.price}
          </Text>
          <Text className="text-[#95D5B2] text-xs ml-1">XAF/{item.unit}</Text>
        </View>

        <Text className="text-[#52B788] text-xs mt-1" numberOfLines={1}>
          By {item.farmer}
        </Text>

        {/* View Details Button */}
        <View className="mt-3 bg-[#D8F3DC] py-2 rounded-xl items-center">
          <Text className="text-[#1B4332] font-bold text-xs">View →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Marketplace Screen ───────────────────────────────────────────────────────
export default function MarketplaceScreen() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const matchSearch =
        search.trim() === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.farmer.toLowerCase().includes(search.toLowerCase());
      const matchCat =
        activeCategory === "All" || p.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [search, activeCategory]);

  return (
    <View className="flex-1 bg-[#F8FDF9]">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-[#1B4332] text-3xl font-black tracking-tighter">
            Marketplace
          </Text>
          <Text className="text-[#52B788] text-sm font-medium">
            Find fresh food from the farm
          </Text>
        </View>

        {/* Search bar */}
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

        {/* Categories */}
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
                className={`rounded-full px-5 py-2.5 ${
                  activeCategory === item
                    ? "bg-[#1B4332]"
                    : "bg-white border border-[#D8F3DC]"
                }`}
              >
                <Text
                  className={`font-bold ${activeCategory === item ? "text-white" : "text-[#1B4332]"}`}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Product Grid */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{
            justifyContent: "space-between",
            paddingHorizontal: 20,
          }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Text className="text-6xl mb-4">🤷‍♀️</Text>
              <Text className="text-[#1B4332] font-bold text-lg">
                We couldnt find that
              </Text>
            </View>
          }
          renderItem={({ item }) => <ProductCard item={item} />}
        />
      </SafeAreaView>
    </View>
  );
}
