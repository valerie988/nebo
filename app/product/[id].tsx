import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity} from "react-native";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProductDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch individual product details from backend
    fetch(`http://172.20.10.2:8000/products/${id}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <View className="flex-1 justify-center"><ActivityIndicator color="#1B4332" /></View>;
  if (!product) return <View className="flex-1 justify-center items-center"><Text>Product not found</Text></View>;

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1">
        <View className="px-5 py-4 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="bg-[#F0FAF4] p-3 rounded-2xl">
            <Text className="text-[#1B4332] font-bold">← Back</Text>
          </TouchableOpacity>
          <Text className="text-[#1B4332] font-bold text-lg">Product Details</Text>
          <View className="w-10" />
        </View>

        <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
          <View className="h-64 w-full bg-[#F0FAF4] rounded-[40px] items-center justify-center my-6">
            <Text className="text-9xl">{product.emoji || "📦"}</Text>
          </View>

          <View className="flex-row justify-between items-start">
            <View className="flex-1 mr-4">
              <Text className="text-3xl font-black text-[#1B4332]">{product.name}</Text>
              <Text className="text-[#52B788] text-lg font-medium">By {product.farmer_name}</Text>
            </View>
            <View className="bg-[#D8F3DC] px-4 py-2 rounded-2xl">
              <Text className="text-[#1B4332] font-bold text-xl">{product.price}</Text>
              <Text className="text-[#1B4332] text-[10px] text-center">XAF</Text>
            </View>
          </View>

          <View className="mt-8">
            <Text className="text-[#1B4332] font-bold text-xl mb-2">About this product</Text>
            <Text className="text-[#2D6A4F] leading-6 text-base">{product.description}</Text>
          </View>

          <View className="bg-[#F0FAF4] p-5 rounded-3xl mt-8 flex-row items-center justify-between">
            <View>
              <Text className="text-[#1B4332] font-bold text-lg">Availability</Text>
              <Text className="text-[#52B788]">Sold per {product.unit}</Text>
            </View>
            <Text className="text-3xl">{product.stock > 0 ? "✅" : "❌"}</Text>
          </View>
        </ScrollView>

        <View className="p-5 border-t border-[#D8F3DC]">
          <TouchableOpacity 
            className="bg-[#1B4332] w-full py-5 rounded-2xl items-center"
            onPress={() => router.push({ pathname: "/chat", params: { farmerId: product.id, farmerName: product.farmer_name }})}
          >
            <Text className="text-white font-bold text-lg">Message Farmer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}