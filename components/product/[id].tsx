import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // This catches the ID from the URL
  const [quantity] = useState(1);

  // In a real app, you'd find the product in your array using the 'id'
  const product = {
    id: id,
    name: "Roma Tomatoes",
    farmer: "Nkomo Farm",
    price: 500,
    unit: "kg",
    emoji: "🍅",
    location: "Bafoussam, West Region",
    description: "Very fresh tomatoes harvested this morning. Perfect for your stews and salads. Mama, these are the best in the market!",
  };

  return (
    <View className="flex-1 bg-white">
      {/* 1. Header with Big Image */}
      <View className="bg-[#F0FAF4] h-80 items-center justify-center relative">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="absolute top-12 left-5 w-12 h-12 bg-white rounded-full items-center justify-center shadow-md z-10"
        >
          <Text className="text-2xl text-[#1B4332]">←</Text>
        </TouchableOpacity>
        
        <Text style={{ fontSize: 160 }}>{product.emoji}</Text>
      </View>

      {/* 2. Product Info */}
      <ScrollView className="flex-1 px-6 -mt-8 bg-white rounded-t-[40px] pt-8">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-[#1B4332] text-3xl font-black">{product.name}</Text>
            <Text className="text-[#52B788] text-base mt-1">📍 {product.location}</Text>
          </View>
          <View className="bg-[#1B4332] px-4 py-3 rounded-2xl">
            <Text className="text-white font-black text-xl">{product.price * quantity}</Text>
            <Text className="text-white text-[10px] text-center">XAF TOTAL</Text>
          </View>
        </View>

        {/* Farmer Info Card */}
        <View className="bg-[#F8FDF9] border border-[#D8F3DC] rounded-3xl p-4 mt-6 flex-row items-center">
          <View className="w-14 h-14 bg-[#B7E4C7] rounded-full items-center justify-center mr-4">
            <Text className="text-3xl">👨‍🌾</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[#1B4332] font-bold text-lg">{product.farmer}</Text>
            <Text className="text-[#95D5B2] text-xs">Always fresh · Top Seller</Text>
          </View>
        </View>

        <Text className="text-[#1B4332] text-lg font-bold mt-8 mb-2">About these tomatoes</Text>
        <Text className="text-[#52B788] text-base leading-6 mb-10">
          {product.description}
        </Text>
      </ScrollView>

      {/* 3. Bottom Actions - Contact Farmer */}
      <View className="px-6 py-6 bg-white border-t border-[#F0FAF4] flex-row space-x-3 pb-10">
        
        {/* Chat with Farmer Button */}
        <TouchableOpacity 
          className="flex-1 bg-[#F0FAF4] h-16 rounded-2xl flex-row items-center justify-center border border-[#D8F3DC]"
          onPress={() => router.push({
            pathname: "/farmer/chat",
            params: { name: product.farmer, product: product.name }
          })}
        >
          <Text className="text-2xl mr-2">💬</Text>
          <Text className="text-[#1B4332] font-black text-base">Message Mama</Text>
        </TouchableOpacity>

        {/* Big Call Button */}
        <TouchableOpacity 
          className="bg-[#1B4332] h-16 w-16 rounded-2xl items-center justify-center shadow-lg"
        >
          <Text className="text-2xl">📞</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}