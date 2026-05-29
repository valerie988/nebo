import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ✅ FIXED: Standardized URL generation matching your global layout architecture
const BASE_URL = Constants.expoConfig?.extra?.API_URL;

export default function EditProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const productId = params.id as string;

  // Form States
  const [name, setName] = useState((params.name as string) || "");
  const [price, setPrice] = useState((params.price as string) || "");
  const [quantity, setQuantity] = useState((params.quantity as string) || "");
  const [category, setCategory] = useState((params.category as string) || "");
  const [unit, setUnit] = useState((params.unit as string) || "");
  const [description, setDescription] = useState(
    (params.description as string) || "",
  );
  const [location, setLocation] = useState((params.location as string) || "");

  // Image States
  const [newImage, setNewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  //  Inline optimization process for the existing background product asset
  const existingProductImageUri = useMemo(() => {
    const originalUrl = params.image as string;
    if (originalUrl && originalUrl.includes("/upload/")) {
      return originalUrl.replace(
        "/upload/",
        "/upload/w_500,h_400,c_fill,q_auto/",
      );
    }
    return originalUrl || null;
  }, [params.image]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setNewImage(result.assets[0].uri);
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const token =
        (await AsyncStorage.getItem("nebo_token")) ||
        (await AsyncStorage.getItem("token"));

      const formData = new FormData();
      formData.append("name", name);
      formData.append("category", category);
      formData.append("unit", unit);
      formData.append("description", description);
      formData.append("location", location);
      formData.append("price", parseFloat(price).toString());
      formData.append("quantity", parseFloat(quantity).toString());

      if (newImage) {
        const filename = newImage.split("/").pop();
        const match = /\.(\w+)$/.exec(filename || "");
        const type = match ? `image/${match[1]}` : `image`;

        formData.append("file", {
          uri:
            Platform.OS === "ios" ? newImage.replace("file://", "") : newImage,
          name: filename || "photo.jpg",
          type,
        } as any);
      }

      const targetEndpoint = `${BASE_URL}/api/products/${productId}`;
      console.log(` Sending dynamic PATCH update to: ${targetEndpoint}`);

      const response = await fetch(targetEndpoint, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          // Note: Leave Content-Type header blank for FormData so boundary markers inject correctly
        },
        body: formData,
      });

      if (response.ok) {
        Alert.alert("Success ✨", "Listing updated!");
        router.back();
      } else {
        const errorData = await response.json();
        Alert.alert("Error", errorData.detail || "Failed to update item.");
      }
    } catch (err) {
      Alert.alert("Error", "Could not save changes.");
      console.error("Update Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F0FAF4]">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{ padding: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View className="flex-row items-center mb-5">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 bg-white rounded-full items-center justify-center border border-[#D8F3DC]"
              >
                <Ionicons name="arrow-back" size={24} color="#1B4332" />
              </TouchableOpacity>
              <Text className="ml-4 text-[#1B4332] text-2xl font-black">
                Edit Product
              </Text>
            </View>

            {/* Image Selector Container Frame */}
            <TouchableOpacity
              onPress={pickImage}
              className="mb-5"
              activeOpacity={0.9}
            >
              <View className="w-full h-44 bg-white rounded-[32px] border-2 border-dashed border-[#B7E4C7] overflow-hidden items-center justify-center">
                {newImage || existingProductImageUri ? (
                  <Image
                    source={{ uri: newImage || existingProductImageUri! }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="items-center">
                    <Ionicons name="image-outline" size={40} color="#95D5B2" />
                    <Text className="text-[#95D5B2] font-bold mt-2">
                      Replace Photo
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Input fields panel wrapper */}
            <View className="bg-white rounded-[32px] p-6 border border-[#D8F3DC] shadow-sm">
              {/* Basic Info */}
              <View className="mb-4">
                <Text className="text-[#95D5B2] text-[10px] font-black uppercase mb-2 ml-1">
                  Product Name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  className="bg-[#F8FDF9] p-4 rounded-2xl text-[#1B4332] font-semibold border border-[#E9F7EF]"
                />
              </View>

              {/* Price & Qty Row */}
              <View className="flex-row justify-between mb-4">
                <View className="w-[48%]">
                  <Text className="text-[#95D5B2] text-[10px] font-black uppercase mb-2 ml-1">
                    Price (XAF)
                  </Text>
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                    className="bg-[#F8FDF9] p-4 rounded-2xl text-[#1B4332] font-semibold border border-[#E9F7EF]"
                  />
                </View>
                <View className="w-[48%]">
                  <Text className="text-[#95D5B2] text-[10px] font-black uppercase mb-2 ml-1">
                    Quantity
                  </Text>
                  <TextInput
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    className="bg-[#F8FDF9] p-4 rounded-2xl text-[#1B4332] font-semibold border border-[#E9F7EF]"
                  />
                </View>
              </View>

              {/* Category Input */}
              <View className="mb-4">
                <Text className="text-[#95D5B2] text-[10px] font-black uppercase tracking-widest mb-2 ml-1">
                  Category
                </Text>
                <View className="flex-row items-center bg-[#F8FDF9] px-4 rounded-2xl border border-[#E9F7EF]">
                  <Ionicons name="pricetag-outline" size={18} color="#52B788" />
                  <TextInput
                    value={category}
                    onChangeText={setCategory}
                    placeholder="Vegetables, Grains, Tubers..."
                    placeholderTextColor="#95D5B2"
                    className="flex-1 p-4 text-[#1B4332] font-semibold"
                  />
                </View>
              </View>

              {/* Unit Input */}
              <View className="mb-4">
                <Text className="text-[#95D5B2] text-[10px] font-black uppercase tracking-widest mb-2 ml-1">
                  Unit of Measurement
                </Text>
                <View className="flex-row items-center bg-[#F8FDF9] px-4 rounded-2xl border border-[#E9F7EF]">
                  <Ionicons name="barbell-outline" size={18} color="#52B788" />
                  <TextInput
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="kg, bucket, bag, crate..."
                    placeholderTextColor="#95D5B2"
                    className="flex-1 p-4 text-[#1B4332] font-semibold"
                  />
                </View>
              </View>

              {/* Location */}
              <View className="mb-4">
                <Text className="text-[#95D5B2] text-[10px] font-black uppercase mb-2 ml-1">
                  Pickup Location
                </Text>
                <View className="flex-row items-center bg-[#F8FDF9] px-4 rounded-2xl border border-[#E9F7EF]">
                  <Ionicons name="location-outline" size={18} color="#52B788" />
                  <TextInput
                    value={location}
                    onChangeText={setLocation}
                    className="flex-1 p-4 text-[#1B4332] font-semibold"
                    placeholder="e.g. Molyko, Buea"
                    placeholderTextColor="#95D5B2"
                  />
                </View>
              </View>

              {/* Description */}
              <View>
                <Text className="text-[#95D5B2] text-[10px] font-black uppercase mb-2 ml-1">
                  Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholder="Tell buyers about your harvest..."
                  placeholderTextColor="#95D5B2"
                  className="bg-[#F8FDF9] p-4 rounded-2xl text-[#1B4332] font-semibold border border-[#E9F7EF] h-24"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleUpdate}
              className="mt-6 bg-[#1B4332] p-5 rounded-[28px] items-center shadow-lg"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-black text-lg">
                  Save Changes
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
