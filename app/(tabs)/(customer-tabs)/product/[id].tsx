import MessageFarmerButton from "@/components/MessageFarmerButton";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
// Centralized apiClient instance handling auth tokens automatically
import apiClient from "@/components/services/authService"; 

export default function ProductDetails() {
  // Pulling the parameters matching your navigation structure
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [rating, setRating] = useState(0);
  const [quantity, setQuantity] = useState(1); // Manages chosen units
  const [ordering, setOrdering] = useState(false); // Controls network activity state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

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
        const { data } = await apiClient.get(`/products/${id}`);
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

  // Dynamic calculated price calculation based on quantity selector state
  const totalAmount = product.price * quantity;

  const handleOrder = async () => {
    setOrdering(true);
    try {
      // Robust payload sent to the backend to generate the order 
      // and trigger the push notification to the farmer automatically.
      const orderPayload = {
        product_id: id,
        product_name: product.name,
        farmer_id: product.farmer_id,
        quantity: quantity,
        items: product.name,
        total_amount: totalAmount,
      };

      await apiClient.post("/orders/", orderPayload);
      setShowOrderModal(true);
    } catch (err) {
      console.error("Order error:", err);
      setShowErrorModal(true);
    } finally {
      setOrdering(false);
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
        contentContainerStyle={{ paddingBottom: 160 }}
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
            {product?.price} XAF / {product?.unit || 'unit'}
          </Text>

          {/* Farmer and Rating Metadata */}
          <View className="mt-6 flex-row justify-between items-center bg-[#F8FDF9] p-4 rounded-2xl border border-[#D8F3DC]">
            <View>
              <Text className="text-[#1B4332] font-bold text-lg">
                🌾 Sold by {product?.farmer_name || product?.farmer?.full_name || "Unknown Farmer"}
              </Text>
              <Text className="text-[#52B788] text-sm mt-1">
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

          {/* Quantity Selector Section */}
          <View className="mt-6 flex-row justify-between items-center bg-[#F0FAF4] p-4 rounded-2xl border border-[#D8F3DC]">
            <View>
              <Text className="text-[#1B4332] font-bold text-base">Select Quantity</Text>
              <Text className="text-[#52B788] text-xs">Stock Available: {product?.quantity || product?.stock || 0}</Text>
            </View>
            <View className="flex-row items-center gap-4">
              <TouchableOpacity
                className="w-10 h-10 rounded-full bg-white border border-[#2D6A4F] items-center justify-center"
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Text className="text-[#2D6A4F] font-bold text-xl">-</Text>
              </TouchableOpacity>
              <Text className="text-[#1B4332] font-black text-xl min-w-[30px] text-center">
                {quantity}
              </Text>
              <TouchableOpacity
                className="w-10 h-10 rounded-full bg-white border border-[#2D6A4F] items-center justify-center"
                onPress={() => setQuantity((q) => Math.min(product?.quantity || product?.stock || 99, q + 1))}
              >
                <Text className="text-[#2D6A4F] font-bold text-xl">+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Stats */}
          <View className="mt-4 bg-[#F0FAF4] p-4 rounded-2xl border border-[#D8F3DC]">
            <Text className="text-[#52B788] text-xs font-bold uppercase">Category</Text>
            <Text className="text-[#1B4332] font-bold text-lg">{product?.category || "General"}</Text>
          </View>

          <View className="mt-6">
            <Text className="text-[#1B4332] font-bold text-lg mb-2">Description</Text>
            <Text className="text-[#2D6A4F] leading-7 text-base">
              {product?.description || "No description provided."}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View
        className="absolute bottom-0 w-full p-6 bg-white border-t border-[#F0FAF4]"
        style={{ zIndex: 1000, elevation: 10 }}
      >
        {/* Total Price Visualization Display */}
        <View className="flex-row justify-between items-center mb-4 px-1">
          <Text className="text-gray-500 font-medium text-base">Total Price:</Text>
          <Text className="text-[#1B4332] font-black text-2xl">{totalAmount.toFixed(2)} XAF</Text>
        </View>

        <View className="flex-row gap-4">
          <TouchableOpacity
            className="flex-1 bg-[#2D6A4F] h-14 rounded-2xl items-center justify-center"
            onPress={handleOrder} 
            disabled={ordering}
          >
            {ordering ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">Place Order</Text>
            )}
          </TouchableOpacity>

          <MessageFarmerButton
            farmerId={product?.farmer_id}
            farmerName={product?.farmer_name || product?.farmer?.full_name || "Farmer"}
            farmerPhone={product?.farmer?.phone}
          />
        </View>
      </View>

      {/* Success Modal */}
      <Modal visible={showOrderModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/40 px-6">
          <View className="bg-white p-8 rounded-[32px] items-center w-full">
            <Ionicons name="checkmark-circle" size={60} color="#52B788" />
            <Text className="text-2xl font-black text-[#1B4332] mt-4">Order Placed! 🎉</Text>
            <Text className="text-[#2D6A4F] text-center mt-2">
              The farmer has been notified about your order for {product?.name}.
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
            <Text className="text-2xl font-black text-[#1B4332] mt-4">Oops!</Text>
            <Text className="text-[#2D6A4F] text-center mt-2">
              Something went wrong. Please try again.
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}