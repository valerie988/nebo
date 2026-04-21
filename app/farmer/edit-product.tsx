import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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

const API_URL = "http://172.20.10.2:8000";

export default function EditProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const productId = params.id as string;

  // Form States (now including description and location)
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
      const token = await AsyncStorage.getItem("nebo_token");

      // 1. Update Text Data (PATCH)
      const updateData = {
        name,
        category,
        unit,
        description,
        location,
        price: parseFloat(price),
        quantity: parseFloat(quantity),
      };

      const response = await fetch(`${API_URL}/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        Alert.alert("Success ✨", "Listing updated!");
        router.back();
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
            <View className="flex-row items-center mb-4">
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

            {/* Image Selector */}
            <TouchableOpacity onPress={pickImage} className="mb-4">
              <View className="w-full h-44 bg-white rounded-[32px] border-2 border-dashed border-[#B7E4C7] overflow-hidden items-center justify-center">
                {newImage || params.image ? (
                  <Image
                    source={{ uri: newImage || (params.image as string) }}
                    className="w-full h-full"
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

            <View className="bg-white rounded-[32px] p-6 border border-[#D8F3DC] shadow-sm space-y-4">
              {/* Basic Info */}
              <View>
                <Text className="text-[#95D5B2] text-[10px] font-black uppercase mb-2  ml-1">
                  Product Name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  className="bg-[#F8FDF9] p-4 rounded-2xl text-[#1B4332] font-semibold border border-[#E9F7EF]"
                />
              </View>

              {/* Price & Qty Row */}
              <View className="flex-row justify-between">
                <View className="w-[48%]">
                  <Text className="text-[#95D5B2] text-[10px] font-black uppercase mb-2 mt-5 ml-1">
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
                  <Text className="text-[#95D5B2] text-[10px] font-black uppercase mb-2 mt-5 ml-1">
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
              {/* Category Input (Newly Added) */}
              <View>
                <Text className="text-[#95D5B2] text-[10px] font-black uppercase tracking-widest mb-2 mt-3 ml-1">
                  Category
                </Text>
                <View className="flex-row items-center bg-[#F8FDF9] px-4 rounded-2xl border border-[#E9F7EF]">
                  <Ionicons name="pricetag-outline" size={18} color="#52B788" />
                  <TextInput
                    value={category}
                    onChangeText={setCategory}
                    placeholder="Vegetables, Grains, Tubers..."
                    className="flex-1 p-4 text-[#1B4332] font-semibold"
                  />
                </View>
              </View>

              {/* Unit Input (Newly Added) */}
              <View>
                <Text className="text-[#95D5B2] text-[10px] font-black uppercase tracking-widest mb-2 mt-4 ml-1">
                  Unit of Measurement
                </Text>
                <View className="flex-row items-center bg-[#F8FDF9] px-4 rounded-2xl border border-[#E9F7EF]">
                  <Ionicons name="barbell-outline" size={18} color="#52B788" />
                  <TextInput
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="kg, bucket, bag, crate..."
                    className="flex-1 p-4 text-[#1B4332] font-semibold"
                  />
                </View>
              </View>

              {/* Location */}
              <View>
                <Text className="text-[#95D5B2] text-[10px] font-black uppercase mb-2 mt-5 ml-1">
                  Pickup Location
                </Text>
                <View className="flex-row items-center bg-[#F8FDF9] px-4 rounded-2xl border border-[#E9F7EF]">
                  <Ionicons name="location-outline" size={18} color="#52B788" />
                  <TextInput
                    value={location}
                    onChangeText={setLocation}
                    className="flex-1 p-4 text-[#1B4332] font-semibold"
                    placeholder="e.g. Molyko, Buea"
                  />
                </View>
              </View>

              {/* Description */}
              <View>
                <Text className="text-[#95D5B2] text-[10px] font-black uppercase mb-2 mt-5 ml-1">
                  Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholder="Tell buyers about your harvest..."
                  className="bg-[#F8FDF9] p-4 rounded-2xl text-[#1B4332] font-semibold border border-[#E9F7EF] h-24"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleUpdate}
              className="mt-8 bg-[#1B4332] p-5 rounded-[28px] items-center shadow-lg"
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
