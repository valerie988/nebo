import MessageFarmerButton from "@/components/MessageFarmerButton";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  const [showErrorModal, setShowErrorModal] = useState(false); // New

  useEffect(() => {
    if (showOrderModal) {
      const timer = setTimeout(() => setShowOrderModal(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showOrderModal]);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        const response = await fetch(`${API_URL}/api/products/${id}`);
        const data = await response.json();
        setProduct(data);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading)
    return (
      <View className="flex-1 justify-center bg-white">
        <ActivityIndicator size="large" color="#1B4332" />
      </View>
    );

  if (!product)
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Product not found.</Text>
      </View>
    );
  // 1. Add these states

  const handleOrder = async () => {
    try {
      const token = await AsyncStorage.getItem("nebo_token");

      // Construct the payload to match what your backend expects
      const orderPayload = {
        product_id: id,
        quantity: 1,
        farmer_id: product.farmer_id, // Added
        items: product.name, // Added
        total_amount: product.price, // Added
      };

      const response = await fetch(`${API_URL}/api/orders/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      if (response.ok) {
        setShowOrderModal(true);
      } else {
        setShowErrorModal(true); // Show error modal instead of alert
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setShowErrorModal(true);
    }
  };
  return (
    <View className="flex-1 bg-[#FDFEFE]">
      {/* Floating Header */}
      <View className="absolute top-12 px-6 w-full flex-row justify-between z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-white/90 p-3 rounded-full shadow-sm"
        >
          <Ionicons name="arrow-back" size={22} color="#1B4332" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setIsLiked(!isLiked)}
          className="bg-white/90 p-3 rounded-full shadow-sm"
        >
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={22}
            color={isLiked ? "#EF4444" : "#1B4332"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className="w-full h-[380px] bg-[#F4F7F6]">
          {product?.photos?.[0] ? (
            <Image
              source={{ uri: product.photos[0] }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <MaterialCommunityIcons name="leaf" size={80} color="#D8F3DC" />
            </View>
          )}
        </View>

        <View className="px-6 py-8">
          <Text className="text-4xl font-black text-[#1B4332] tracking-tight">
            {product?.name}
          </Text>
          <Text className="text-2xl font-bold text-[#2D6A4F] mt-2">
            {product?.price} XAF
          </Text>

          {/* Farmer and Rating Metadata */}
          <View className="mt-6 flex-row justify-between items-center bg-[#F8FDF9] p-4 rounded-2xl border border-[#D8F3DC]">
            <View>
              <Text className="text-[#1B4332] font-bold text-lg">
                {product?.farmer_name ||
                  product?.farmer?.full_name ||
                  "Unknown Farmer"}
              </Text>
              <Text className="text-[#52B788] text-sm">
                📍 {product?.location || "Location not set"}
              </Text>
            </View>

            <View className="flex-row gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={20}
                    color="#F59E0B"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Inventory Stats */}
          <View className="mt-4 flex-row gap-4">
            <View className="flex-1 bg-[#F0FAF4] p-4 rounded-2xl border border-[#D8F3DC]">
              <Text className="text-[#52B788] text-xs font-bold uppercase">
                Quantity
              </Text>
              <Text className="text-[#1B4332] font-bold text-lg">
                {product?.quantity} {product?.unit}
              </Text>
            </View>
            <View className="flex-1 bg-[#F0FAF4] p-4 rounded-2xl border border-[#D8F3DC]">
              <Text className="text-[#52B788] text-xs font-bold uppercase">
                Category
              </Text>
              <Text className="text-[#1B4332] font-bold text-lg">
                {product?.category}
              </Text>
            </View>
          </View>

          <View className="mt-6">
            <Text className="text-[#1B4332] font-bold text-lg mb-2">
              Description
            </Text>
            <Text className="text-[#2D6A4F] leading-7 text-base">
              {product?.description || "No description provided."}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View
        className="absolute bottom-0 w-full p-6 bg-white border-t border-[#F0FAF4] flex-row gap-4"
        pointerEvents="box-none"
        style={{ zIndex: 1000, elevation: 10 }}
      >
        <TouchableOpacity
          className="flex-1 bg-[#2D6A4F] h-14 rounded-2xl items-center justify-center"
          onPress={handleOrder} 
        >
          <Text className="text-white font-bold text-base">Order Directly</Text>
        </TouchableOpacity>

        {/* Ensure this component has no transparent overlays */}
        <MessageFarmerButton
          farmerId={product?.farmer_id}
          farmerName={
            product?.farmer_name || product?.farmer?.full_name || "Farmer"
          }
          farmerPhone={product?.farmer?.phone}
        />
      </View>

      {/* Success Modal */}
      <Modal visible={showOrderModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/40 px-6">
          <View className="bg-white p-8 rounded-[32px] items-center w-full">
            <Ionicons name="checkmark-circle" size={60} color="#52B788" />
            <Text className="text-2xl font-black text-[#1B4332] mt-4">
              Order Placed!
            </Text>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal visible={showErrorModal} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 justify-center items-center bg-black/40 px-6"
          onPress={() => setShowErrorModal(false)}
        >
          <View className="bg-white p-8 rounded-[32px] items-center w-full">
            <Ionicons name="alert-circle" size={60} color="#EF4444" />
            <Text className="text-2xl font-black text-[#1B4332] mt-4">
              Oops!
            </Text>
            <Text className="text-[#2D6A4F] text-center mt-2">
              Something went wrong. Please try again.
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
