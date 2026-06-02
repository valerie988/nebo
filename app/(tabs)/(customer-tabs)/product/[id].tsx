import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const API_URL = Constants.expoConfig?.extra?.API_URL;

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [rating, setRating] = useState(0);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Auto-dismiss modal after 2 seconds
  useEffect(() => {
    if (showOrderModal) {
      const timer = setTimeout(() => setShowOrderModal(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showOrderModal]);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_URL}/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <View className="flex-1 justify-center bg-white"><ActivityIndicator size="large" color="#1B4332" /></View>;

  return (
    <View className="flex-1 bg-[#FDFEFE]">
      {/* Floating Header */}
      <View className="absolute top-12 px-6 w-full flex-row justify-between z-10">
        <TouchableOpacity onPress={() => router.back()} className="bg-white/90 p-3 rounded-full shadow-sm">
          <Ionicons name="arrow-back" size={22} color="#1B4332" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsLiked(!isLiked)} className="bg-white/90 p-3 rounded-full shadow-sm">
          <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? "#EF4444" : "#1B4332"} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="w-full h-[380px] bg-[#F4F7F6]">
          {product?.photos?.[0] ? (
            <Image source={{ uri: product.photos[0] }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="flex-1 items-center justify-center"><MaterialCommunityIcons name="leaf" size={80} color="#D8F3DC" /></View>
          )}
        </View>

        <View className="px-6 py-8">
          <Text className="text-4xl font-black text-[#1B4332] tracking-tight">{product?.name}</Text>
          <Text className="text-2xl font-bold text-[#2D6A4F] mt-2">{product?.price} XAF</Text>

          {/* Farmer and Rating Metadata */}
          <View className="mt-6 flex-row justify-between items-center bg-[#F8FDF9] p-4 rounded-2xl border border-[#D8F3DC]">
            <View>
              <Text className="text-[#1B4332] font-bold text-lg">{product?.farmer_name || "Unknown Farmer"}</Text>
              <Text className="text-[#52B788] text-sm">📍 {product?.location || "Location not set"}</Text>
            </View>
            <View className="flex-row gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons name={star <= rating ? "star" : "star-outline"} size={20} color="#F59E0B" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Inventory Stats */}
          <View className="mt-4 flex-row gap-4">
            <View className="flex-1 bg-[#F0FAF4] p-4 rounded-2xl border border-[#D8F3DC]">
              <Text className="text-[#52B788] text-xs font-bold uppercase">Quantity</Text>
              <Text className="text-[#1B4332] font-bold text-lg">{product?.quantity} {product?.unit}</Text>
            </View>
            <View className="flex-1 bg-[#F0FAF4] p-4 rounded-2xl border border-[#D8F3DC]">
              <Text className="text-[#52B788] text-xs font-bold uppercase">Category</Text>
              <Text className="text-[#1B4332] font-bold text-lg">{product?.category}</Text>
            </View>
          </View>

          <View className="mt-6">
            <Text className="text-[#1B4332] font-bold text-lg mb-2">Description</Text>
            <Text className="text-[#2D6A4F] leading-7 text-base">{product?.description || "No description provided."}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View className="absolute bottom-0 w-full p-6 bg-white border-t border-[#F0FAF4] flex-row gap-4">
        <TouchableOpacity className="flex-1 bg-[#2D6A4F] h-14 rounded-2xl items-center justify-center" onPress={() => setShowOrderModal(true)}>
          <Text className="text-white font-bold text-base">Order Directly</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className="w-14 h-14 bg-[#F0FAF4] rounded-2xl items-center justify-center"
          onPress={() => router.push({ pathname: "/chat", params: { farmerId: product.farmer_id, farmerName: product.farmer_name }})}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color="#1B4332" />
        </TouchableOpacity>
      </View>

      {/* Auto-closing Modal */}
      <Modal visible={showOrderModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/40 px-6">
          <View className="bg-white p-8 rounded-[32px] items-center w-full">
            <Ionicons name="checkmark-circle" size={60} color="#52B788" />
            <Text className="text-2xl font-black text-[#1B4332] mt-4">Order Placed!</Text>
            <Text className="text-[#2D6A4F] text-center mt-2">The farmer has been notified.</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}