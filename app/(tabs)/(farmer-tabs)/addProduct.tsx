import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DRAFT_KEY = "nebo_product_draft";
const CATEGORIES = [
  "Veggies",
  "Fruits",
  "Grains",
  "Herbs",
  "Roots",
  "Dairy",
  "Other",
];

// Pulling your dynamic base URL from app.config.js
const BASE_URL =
  Constants.expoConfig?.extra?.API_URL || "http://192.168.11.104:8000";

export default function AddProductScreen() {
  const router = useRouter();

  const [showDropdown, setShowDropdown] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("kg");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");

  // Load Draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const saved = await AsyncStorage.getItem(DRAFT_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          setName(data.name || "");
          setCategory(data.category || "");
          setPrice(data.price || "");
          setQuantity(data.quantity || "");
          setLocation(data.location || "");
          setUnit(data.unit || "kg");
          setDescription(data.description || "");
        }
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    };
    loadDraft();
  }, []);

  const saveToDraft = async () => {
    const draft = {
      name,
      category,
      price,
      quantity,
      location,
      unit,
      description,
    };
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    // 1. Validation
    if (!name || !category || !price || !quantity || !location) {
      Alert.alert("Required Fields", "Please fill in all fields marked with *");
      return;
    }

    setLoading(true);
    let finalImageUrl = "";

    try {
      // 2. Upload to Cloudinary First (If an image exists)
      if (image) {
        console.log("☁️ Starting Cloudinary upload...");

        const cloudinaryFormData = new FormData();
        const filename = image.split("/").pop() || "harvest.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        cloudinaryFormData.append("file", {
          uri: image,
          name: filename,
          type: type,
        } as any);
        const CLOUD_NAME = Constants.expoConfig?.extra?.CLOUDINARY_CLOUD_NAME;

        const UPLOAD_PRESET =
          Constants.expoConfig?.extra?.CLOUDINARY_UPLOAD_PRESET;
        if (!CLOUD_NAME || !UPLOAD_PRESET) {
          console.error("❌ Environment variables missing!", {
            CLOUD_NAME,
            UPLOAD_PRESET,
          });
          throw new Error(
            "Cloudinary configuration missing. Please check your .env file.",
          );
        }

        cloudinaryFormData.append("upload_preset", UPLOAD_PRESET);

        console.log(`☁️ Uploading to Cloudinary cloud: ${CLOUD_NAME}`);

        const cloudinaryResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          {
            method: "POST",
            body: cloudinaryFormData,
            headers: {
              Accept: "application/json",
            },
          },
        );

        const cloudinaryResult = await cloudinaryResponse.json();

        if (!cloudinaryResponse.ok) {
          throw new Error(
            cloudinaryResult.error?.message || "Cloudinary upload failed",
          );
        }

        finalImageUrl = cloudinaryResult.secure_url;
        console.log("✅ Cloudinary Upload Success! URL:", finalImageUrl);
      }

      // 3. Fetch Auth Token
      const token =
        (await AsyncStorage.getItem("nebo_token")) ||
        (await AsyncStorage.getItem("token"));

      // 4. Send clean JSON data to FastAPI backend
      const payload = {
        name,
        category,
        description: description || "",
        price: parseFloat(price),
        unit,
        quantity: parseFloat(quantity),
        location,
        image: finalImageUrl,
      };

      console.log(
        `📡 Sending product payload to: ${BASE_URL}/api/products`,
        payload,
      );

      // ✅ FIXED: Changed from API_URL to BASE_URL
      const response = await fetch(`${BASE_URL}/api/products`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert("Success! 🌿", "Your product has been listed.");
        await AsyncStorage.removeItem(DRAFT_KEY);
        router.back();
      } else {
        Alert.alert("Error", result.detail || "Failed to list product");
      }
    } catch (error: any) {
      console.error("Upload process error details:", error);
      Alert.alert(
        "Error",
        error.message || "Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F0FAF4]">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Ionicons name="arrow-back" size={28} color="#1B7344" />
            </TouchableOpacity>
            <Text className="text-[#1B7344] text-2xl font-black">
              Add Product
            </Text>
          </View>
          <TouchableOpacity
            onPress={saveToDraft}
            className="bg-white px-4 py-2 rounded-xl border border-[#D8F3DC]"
          >
            <Text className="text-[#1B7344] font-bold text-xs">
              {draftSaved ? "✓ Saved" : "Save Draft"}
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 50 }}
          >
            {/* Image Uploader */}
            <Text className="text-[#1B4332] font-bold text-base mt-4 mb-2">
              Upload Image
            </Text>
            <TouchableOpacity
              onPress={pickImage}
              className="w-full h-44 border-2 border-dashed border-[#B7E4C7] rounded-[30px] items-center justify-center bg-white overflow-hidden "
            >
              {image ? (
                <Image source={{ uri: image }} className="w-full h-full" />
              ) : (
                <View className="items-center">
                  <Text className="text-[#95D5B2] text-xs mb-2">
                    Upload Thumbnail image
                  </Text>
                  <Ionicons name="image-outline" size={44} color="#1B7344" />
                </View>
              )}
            </TouchableOpacity>

            {/* Inputs Container */}
            <View className="mt-6">
              <View className="mb-5">
                <Text className="text-[#1B4332] font-bold text-sm mb-1 ml-1">
                  Product Name *
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Fresh Tomatoes"
                  className="w-full bg-white border border-[#D8F3DC] rounded-2xl px-5 py-4 text-[#1B4332]"
                />
              </View>

              <View className="mb-5">
                <Text className="text-[#1B4332] font-bold text-sm mb-1 ml-1">
                  Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Tell us about the harvest..."
                  multiline
                  className="w-full bg-white border border-[#D8F3DC] rounded-2xl px-5 py-4 h-24"
                  textAlignVertical="top"
                />
              </View>

              <View className="mb-5">
                <Text className="text-[#1B4332] font-bold text-sm mb-1 ml-1">
                  Category *
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDropdown(true)}
                  className="w-full bg-white border border-[#D8F3DC] rounded-2xl px-5 py-4 flex-row justify-between items-center"
                >
                  <Text
                    className={category ? "text-[#1B4332]" : "text-gray-400"}
                  >
                    {category || "Select a category"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#1B7344" />
                </TouchableOpacity>
              </View>

              <View className="flex-row gap-3 mb-5">
                <View className="flex-1">
                  <Text className="text-[#1B4332] font-bold text-sm mb-1 ml-1">
                    Quantity *
                  </Text>
                  <TextInput
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="50"
                    keyboardType="numeric"
                    className="bg-white border border-[#D8F3DC] rounded-2xl px-5 py-4"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[#1B4332] font-bold text-sm mb-1 ml-1">
                    Unit *
                  </Text>
                  <TextInput
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="kg"
                    className="bg-white border border-[#D8F3DC] rounded-2xl px-5 py-4"
                  />
                </View>
              </View>

              <View className="mb-5">
                <Text className="text-[#1B4332] font-bold text-sm mb-1 ml-1">
                  Price (XAF) *
                </Text>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  placeholder="Price per unit"
                  keyboardType="numeric"
                  className="w-full bg-white border border-[#D8F3DC] rounded-2xl px-5 py-4"
                />
              </View>

              <View>
                <Text className="text-[#1B4332] font-bold text-sm mb-1 ml-1">
                  Location *
                </Text>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. Buea, Molyko"
                  className="w-full bg-white border border-[#D8F3DC] rounded-2xl px-5 py-4"
                />
              </View>
            </View>

            {/* Post Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className="bg-[#1B7344] w-full py-5 rounded-[40px] mt-10 items-center justify-center shadow-lg"
              style={{ elevation: 5, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-xl font-black">Post</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Category Modal */}
        <Modal visible={showDropdown} transparent animationType="fade">
          <TouchableOpacity
            className="flex-1 bg-black/20 justify-center items-center px-10"
            activeOpacity={1}
            onPress={() => setShowDropdown(false)}
          >
            <View className="bg-white w-full rounded-3xl p-6 shadow-2xl">
              <Text className="text-[#1B7344] font-black text-lg mb-4">
                Select Category
              </Text>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  className="py-4 border-b border-gray-100"
                  onPress={() => {
                    setCategory(cat);
                    setShowDropdown(false);
                  }}
                >
                  <Text className="text-[#1B4332] font-semibold">{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
