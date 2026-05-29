import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// --- Configuration ---
const API_URL = Constants.expoConfig?.extra?.API_URL;

const getProductIcon = (category: string) => {
  switch (category?.toLowerCase()) {
    case "veggies":
      return "carrot";
    case "fruits":
      return "food-apple";
    case "grains":
      return "barley";
    case "herbs":
      return "leaf";
    case "roots":
      return "corn";
    default:
      return "package-variant-closed";
  }
};

export default function ProductDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!API_URL) {
      console.warn("API_URL is undefined in config files.");
      return;
    }

    fetch(`${API_URL}/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed fetching item fields", err);
        setLoading(false);
      });
  }, [id]);

  // 📸 Process primary display asset with Cloudinary delivery optimizations
  const displayImageUri = useMemo(() => {
    if (product?.photos && product.photos.length > 0) {
      const originalUrl = product.photos[0];
      if (originalUrl.includes("/upload/")) {
        return originalUrl.replace(
          "/upload/",
          "/upload/w_800,h_600,c_fill,q_auto/",
        );
      }
      return originalUrl;
    }
    // Backward compatibility for standard single image parameter string injection
    if (product?.image && product.image.includes("/upload/")) {
      return product.image.replace(
        "/upload/",
        "/upload/w_800,h_600,c_fill,q_auto/",
      );
    }
    return product?.image || null;
  }, [product]);

  // Aligns stock check with system schemas tracking listing balance bounds
  const hasAvailableInventory = product ? product.quantity > 0 : false;

  if (loading) {
    return (
      <View className="flex-1 justify-center bg-white">
        <ActivityIndicator size="large" color="#1B4332" />
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 justify-center items-center bg-white p-5">
        <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
        <Text className="text-[#1B4332] font-bold text-lg mt-2">
          Product not found
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1">
        {/* Navigation Bar Header */}
        <View className="px-5 py-4 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-[#F0FAF4] p-3 rounded-2xl flex-row items-center"
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color="#1B4332"
              style={{ marginRight: 4 }}
            />
            <Text className="text-[#1B4332] font-bold">Back</Text>
          </TouchableOpacity>
          <Text className="text-[#1B4332] font-black text-lg tracking-tight">
            Product Details
          </Text>
          <View className="w-16" />
        </View>

        <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
          {/* Main Visual Frame Container */}
          <View className="h-64 w-full bg-[#F0FAF4] rounded-[40px] items-center justify-center my-6 shadow-sm border border-[#D8F3DC] overflow-hidden relative">
            {displayImageUri ? (
              <Image
                source={{ uri: displayImageUri }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <MaterialCommunityIcons
                name={getProductIcon(product.category)}
                size={110}
                color="#2D6A4F"
              />
            )}

            {!hasAvailableInventory && (
              <View className="absolute bg-red-500/90 px-5 py-2 rounded-full shadow-sm z-10">
                <Text className="text-white text-xs font-black uppercase tracking-widest">
                  Out of Stock
                </Text>
              </View>
            )}
          </View>

          {/* Heading Metadata block */}
          <View className="flex-row justify-between items-start">
            <View className="flex-1 mr-4">
              <Text className="text-3xl font-black text-[#1B4332] tracking-tight leading-8">
                {product.name}
              </Text>
              <View className="flex-row items-center gap-1 mt-1.5">
                <Ionicons name="person-outline" size={14} color="#52B788" />
                <Text className="text-[#52B788] text-base font-semibold">
                  By {product.farmer_name}
                </Text>
              </View>
            </View>
            <View className="bg-[#D8F3DC] px-4 py-2.5 rounded-2xl items-center min-w-[75px]">
              <Text className="text-[#1B4332] font-black text-xl">
                {product.price}
              </Text>
              <Text className="text-[#2D6A4F] font-black text-[9px] tracking-wider uppercase mt-0.5">
                XAF
              </Text>
            </View>
          </View>

          {/* About Segment Section */}
          <View className="mt-8">
            <Text className="text-[#1B4332] font-bold text-xl mb-2.5">
              About this product
            </Text>
            <Text className="text-[#2D6A4F] leading-6 text-base font-medium">
              {product.description ||
                "No description provided for this listing."}
            </Text>
          </View>

          {/* Availability Info row */}
          <View className="bg-[#F0FAF4] p-5 rounded-3xl mt-8 mb-6 flex-row items-center justify-between border border-[#D8F3DC]">
            <View className="flex-row items-center gap-3">
              <View className="bg-white p-2.5 rounded-xl">
                <Ionicons name="cube-outline" size={22} color="#1B4332" />
              </View>
              <View>
                <Text className="text-[#1B4332] font-bold text-base">
                  Availability
                </Text>
                <Text className="text-[#52B788] text-xs font-semibold mt-0.5">
                  {hasAvailableInventory
                    ? `${product.quantity} units available`
                    : "Sold out"}{" "}
                  · Sold per {product.unit || "unit"}
                </Text>
              </View>
            </View>
            {hasAvailableInventory ? (
              <Ionicons name="checkmark-circle" size={28} color="#2D6A4F" />
            ) : (
              <Ionicons name="close-circle" size={28} color="#DC2626" />
            )}
          </View>
        </ScrollView>

        {/* Action Button Footer section wrapper */}
        <View className="p-5 border-t border-[#D8F3DC] bg-white">
          <TouchableOpacity
            activeOpacity={0.85}
            className="bg-[#1B4332] w-full py-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-md"
            onPress={() =>
              router.push({
                pathname: "/chat",
                params: {
                  farmerId: product.id,
                  farmerName: product.farmer_name,
                },
              })
            }
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={20}
              color="white"
            />
            <Text className="text-white font-bold text-lg">Message Farmer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
