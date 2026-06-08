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
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Read the dynamic API configuration from app.config.js / app.json
const API_URL = Constants.expoConfig?.extra?.API_URL;

export default function EditProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Editable Fields
  const [name, setName] = useState((params.name as string) || "");
  const [location, setLocation] = useState((params.loc as string) || "");
  const [image, setImage] = useState<string | null>(null);

  // States
  const [loading, setLoading] = useState(false);

  // 📸 Dynamic optimization transform step for incoming Cloudinary current profiles
  const currentProfileImageUri = useMemo(() => {
    const originalUrl = params.currentImage as string;
    if (originalUrl && originalUrl.includes("/upload/")) {
      return originalUrl.replace(
        "/upload/",
        "/upload/w_200,h_200,c_fill,q_auto/",
      );
    }
    return originalUrl || null;
  }, [params.currentImage]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleUpdate = async () => {
    setLoading(true);
    let uploadedImageUrl = currentProfileImageUri;

    // Ensure these are defined correctly
    const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    try {
      // 1. Upload to Cloudinary
      if (image) {
        const formData = new FormData();
        formData.append("file", {
          uri: image,
          name: "avatar.jpg",
          type: "image/jpeg",
        } as any);
        // ✅ FIXED: Use the variable UPLOAD_PRESET instead of a hardcoded string
        formData.append("upload_preset", UPLOAD_PRESET!);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          {
            method: "POST",
            body: formData, // ✅ FIXED: Used the actual formData object created above
            headers: {
              Accept: "application/json",
            },
          },
        );

        const cloudData = await response.json(); // ✅ FIXED: consistent naming

        if (!cloudData.secure_url) {
          throw new Error(
            "Cloudinary upload failed: " + JSON.stringify(cloudData),
          );
        }
        uploadedImageUrl = cloudData.secure_url;
      }

      // 2. PATCH request to Backend
      const token = await AsyncStorage.getItem("nebo_token");
      const response = await fetch(`${API_URL}/api/auth/update`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: name,
          location: location,
          avatar_url: uploadedImageUrl,
        }),
      });

      if (response.ok) {
        Alert.alert("Success ", "Profile updated.");
        router.back();
      } else {
        const errJson = await response.json();
        console.error("Backend Error:", errJson);
        Alert.alert(
          "Update Error",
          errJson.detail || "Error updating profile.",
        );
      }
    } catch (e) {
      console.error("Update Exception:", e);
      Alert.alert(
        "Error",
        "Check your connection or Cloudinary configuration.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <View className="flex-1 bg-[#F0FAF4]">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 24 }}
        >
          {/* Header Navigation */}
          <View className="flex-row justify-between items-center mb-8">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 bg-white rounded-full items-center justify-center border border-[#D8F3DC]"
            >
              <Ionicons name="arrow-back" size={20} color="#1B4332" />
            </TouchableOpacity>
            <Text className="text-[#1B4332] text-xl font-black">
              Edit Profile
            </Text>
            <View className="w-10" />
          </View>

          {/* Profile Photo Section */}
          <View className="items-center mb-10">
            <TouchableOpacity
              onPress={pickImage}
              activeOpacity={0.9}
              className="relative"
            >
              <View className="w-36 h-36 rounded-[45px] bg-white border-2 border-dashed border-[#B7E4C7] overflow-hidden items-center justify-center shadow-sm">
                {image || currentProfileImageUri ? (
                  <Image
                    source={{ uri: image || currentProfileImageUri! }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="items-center justify-center bg-[#D8F3DC] w-full h-full">
                    <Ionicons name="person" size={56} color="#2D6A4F" />
                  </View>
                )}
              </View>
              <View className="absolute bottom-1 right-1 bg-[#1B4332] p-2.5 rounded-full border-4 border-[#F0FAF4]">
                <Ionicons name="camera" size={18} color="white" />
              </View>
            </TouchableOpacity>
            <Text className="text-[#52B788] font-bold mt-4">
              Change Business Photo
            </Text>
          </View>

          {/* Section: Business Credentials (Editable) */}
          <Text className="text-[#1B4332] font-black text-[10px] uppercase tracking-[2px] mb-4 ml-1">
            Store Information
          </Text>

          <View className="bg-white rounded-[28px] p-5 border border-[#D8F3DC] mb-8">
            <View className="mb-5">
              <Text className="text-[#95D5B2] text-[11px] font-bold mb-2 ml-1">
                Display Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                className="bg-[#F0FAF4] p-4 rounded-2xl text-[#1B4332] font-semibold border border-[#E9F7EF]"
                placeholder="Business or Personal Name"
                placeholderTextColor="#95D5B2"
              />
            </View>

            <View>
              <Text className="text-[#95D5B2] text-[11px] font-bold mb-2 ml-1">
                Farm/Store Location
              </Text>
              <TextInput
                value={location}
                onChangeText={setLocation}
                className="bg-[#F0FAF4] p-4 rounded-2xl text-[#1B4332] font-semibold border border-[#E9F7EF]"
                placeholder="e.g. Molyko, Buea"
                placeholderTextColor="#95D5B2"
              />
            </View>
          </View>

          {/* Section: Account Metadata (Read-Only) */}
          <Text className="text-[#1B4332] font-black text-[10px] uppercase tracking-[2px] mb-4 ml-1">
            Account Security
          </Text>

          <View className="bg-white rounded-[28px] p-5 border border-[#D8F3DC] mb-10 opacity-70">
            <View className="flex-row justify-between items-center mb-5">
              <View>
                <Text className="text-[#95D5B2] text-[11px] font-bold mb-1">
                  Email Address
                </Text>
                <Text className="text-[#1B4332] font-semibold">
                  {params.email || "farmer@nebo.com"}
                </Text>
              </View>
              <Ionicons name="lock-closed-outline" size={16} color="#B7E4C7" />
            </View>

            <View className="flex-row justify-between items-center mb-5">
              <View>
                <Text className="text-[#95D5B2] text-[11px] font-bold mb-1">
                  Account ID
                </Text>
                <Text className="text-[#1B4332] font-semibold">
                  #{params.userId || "88231"}
                </Text>
              </View>
              <Ionicons name="finger-print-outline" size={16} color="#B7E4C7" />
            </View>

            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-[#95D5B2] text-[11px] font-bold mb-1">
                  Membership
                </Text>
                <Text className="text-[#1B4332] font-semibold">
                  Joined {params.joinDate || "April 2026"}
                </Text>
              </View>
              <View className="bg-[#D8F3DC] px-3 py-1 rounded-full">
                <Text className="text-[#1B7344] text-[9px] font-black uppercase">
                  Verified
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleUpdate}
            activeOpacity={0.8}
            disabled={loading}
            className="bg-[#1B4332] p-5 rounded-[26px] items-center shadow-lg shadow-[#1B4332]/20"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-black text-lg">
                Update Profile
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity className="mt-6 items-center">
            <Text className="text-red-400 font-bold text-xs">
              Request Account Deletion
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
