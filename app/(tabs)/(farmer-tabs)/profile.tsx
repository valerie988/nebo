import { useAuth } from "@/components/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = Constants.expoConfig?.extra?.API_URL;

// --- Subcomponents ---
function QuickLink({ icon, label, subtitle, onPress, accent }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{ backgroundColor: accent }}
      className="flex-1 rounded-[24px] p-5 mx-[6px] shadow-sm"
    >
      <View className="mb-3 bg-white/10 w-9 h-9 rounded-xl items-center justify-center">
        <Feather name={icon} size={16} color="white" />
      </View>
      <Text className="text-white font-black text-[14px]">{label}</Text>
      <Text className="text-white/60 text-[10px] mt-0.5">{subtitle}</Text>
    </TouchableOpacity>
  );
}

function MenuRow({
  icon,
  label,
  subtitle,
  onPress,
  danger = false,
  rightText,
}: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center py-4 border-b border-[#F0FAF4]"
    >
      <View
        className={`w-10 h-10 rounded-2xl items-center justify-center mr-4 ${danger ? "bg-red-50" : "bg-[#F0FAF4]"}`}
      >
        <Feather name={icon} size={16} color={danger ? "#EF4444" : "#2D6A4F"} />
      </View>
      <View className="flex-1">
        <Text
          className={`text-[15px] font-bold ${danger ? "text-red-600" : "text-[#1B4332]"}`}
        >
          {label}
        </Text>
        {subtitle && (
          <Text className="text-[11px] text-[#95D5B2] mt-0.5">{subtitle}</Text>
        )}
      </View>
      {rightText && (
        <Text className="text-[#52B788] text-xs font-bold mr-2 capitalize">
          {rightText}
        </Text>
      )}
      <Feather
        name="chevron-right"
        size={16}
        color={danger ? "#FCA5A5" : "#D8F3DC"}
      />
    </TouchableOpacity>
  );
}

export default function FarmerProfileScreen() {
  const { logout } = useAuth();
  const router = useRouter();

  // Core Profile Data States
  const [farmer, setFarmer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Verification Modal UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("nebo_token");
      if (!token) return;

      // 🌟 FIXED: Added /api router prefix matching your backend's main app config layout
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      console.log("=== NEBO PROFILE WITH STATS ===", data);

      if (response.ok) {
        setFarmer(data);
      }
    } catch (err) {
      console.error("Profile view sync error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Add this inside FarmerProfileScreen
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchProfile(); 
  }, []);

  const handleUpdateProfileData = async (updatedFields: {
    full_name?: string;
    location?: string;
  }) => {
    try {
      const token = await AsyncStorage.getItem("nebo_token");
      const response = await fetch(`${API_URL}/api/auth/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedFields),
      });

      if (response.ok) {
        Alert.alert("Success", "Profile information updated cleanly.");
        fetchProfile();
      } else {
        const errData = await response.json();
        Alert.alert(
          "Update Denied",
          errData.detail || "Could not modify user record.",
        );
      }
    } catch (err) {
      console.error(err);
      Alert.alert(
        "Connection Failure",
        "Server dropped profile modifications.",
      );
    }
  };

  const pickImage = async (target: "id" | "selfie") => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Required",
        "Camera access is needed to capture identity verification files.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: target === "id" ? [16, 10] : [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      if (target === "id") setIdPhoto(result.assets[0].uri);
      if (target === "selfie") setSelfiePhoto(result.assets[0].uri);
    }
  };

  const handleUploadVerification = async () => {
    if (!idPhoto || !selfiePhoto) {
      Alert.alert(
        "Missing Documents",
        "Please snap snapshots of both your national ID Card and verification selfie.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("nebo_token");
      const formData = new FormData();

      const idFilename = idPhoto.split("/").pop() || "id_card.jpg";
      const selfieFilename = selfiePhoto.split("/").pop() || "selfie.jpg";

      formData.append("id_card", {
        uri: idPhoto,
        name: idFilename,
        type: "image/jpeg",
      } as any);

      formData.append("selfie", {
        uri: selfiePhoto,
        name: selfieFilename,
        type: "image/jpeg",
      } as any);

      // 🌟 FIXED: Added /api to match your backend layout structure
      const response = await fetch(`${API_URL}/api/auth/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        Alert.alert(
          "Documents Uploaded",
          "Your verification documents have been forwarded safely to the management team.",
        );
        setIsModalOpen(false);
        setIdPhoto(null);
        setSelfiePhoto(null);
        fetchProfile();
      } else {
        Alert.alert("Submission Failure", "Could not upload file streams.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert(
        "Network Error",
        "Something went wrong while connecting to the verification service.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerificationPress = () => {
    if (farmer?.is_verified) {
      Alert.alert(
        "Verified Account",
        "Your store is verified and fully prioritized across consumer layouts.",
      );
      return;
    }
    setIsModalOpen(true);
  };

  if (loading)
    return (
      <ActivityIndicator
        className="flex-1 justify-center items-center"
        color="#1B4332"
      />
    );

  const verificationStatus = farmer?.is_verified ? "verified" : "unverified";

  return (
    <View className="flex-1 bg-[#F0FAF4]">
      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchProfile}
              tintColor="#1B4332"
            />
          }
        >
          {/* Header */}
          <View className="px-6 pt-6 pb-4 flex-row justify-between items-end">
            <Text className="text-[#1B4332] text-[36px] font-black tracking-tighter">
              Profile
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/notifications")}
              className="w-12 h-12 bg-white rounded-2xl items-center justify-center border border-[#D8F3DC] shadow-sm relative"
            >
              <Feather name="bell" size={20} color="#1B4332" />
              <View className="absolute top-3 right-3 w-2 h-2 bg-amber-500 rounded-full" />
            </TouchableOpacity>
          </View>

          {/* Hero Profile Card */}
          <View className="mx-6 bg-[#1B4332] rounded-[32px] p-6 mb-4 shadow-lg border border-[#143225]">
            <View className="flex-row items-center mb-6">
              <View className="w-[75px] h-[75px] rounded-[24px] bg-[#2D6A4F] items-center justify-center mr-4 border border-[#3A8765]">
                {farmer?.avatar_url ? (
                  <Image
                    source={{ uri: farmer.avatar_url }}
                    className="w-full h-full rounded-[24px]"
                  />
                ) : (
                  <Feather name="user" size={32} color="white" />
                )}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text
                    className="text-white font-black text-xl mr-1.5"
                    numberOfLines={1}
                  >
                    {farmer?.full_name || "Farmer"}
                  </Text>
                  {farmer?.is_verified && (
                    <View className="bg-[#52B788] rounded-full p-0.5">
                      <Feather
                        name="check"
                        size={10}
                        color="white"
                        strokeWidth={4}
                      />
                    </View>
                  )}
                </View>
                <Text
                  className="text-[#95D5B2] text-xs font-semibold mt-0.5"
                  numberOfLines={1}
                >
                  {farmer?.email || "No email linked"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/farmer/edit-profile",
                    params: { name: farmer?.full_name, loc: farmer?.location },
                  })
                }
                className="w-9 h-9 items-center justify-center rounded-xl bg-white/10"
              >
                <Feather name="edit-3" size={16} color="white" />
              </TouchableOpacity>
            </View>

            <View className="flex-row bg-[#2D6A4F] rounded-[22px] py-4 border border-[#3A8765]">
              <View className="flex-1 items-center border-r border-[#1B4332]">
                <Text className="text-white font-black text-lg">
                  {farmer?.total_products ?? 0}
                </Text>
                <Text className="text-[#95D5B2] text-[9px] uppercase font-black tracking-wider mt-0.5">
                  Products
                </Text>
              </View>
              <View className="flex-1 items-center px-2 flex-row justify-center">
                <Feather
                  name="map-pin"
                  size={12}
                  color="#95D5B2"
                  style={{ marginRight: 4 }}
                />
                <View className="items-center">
                  <Text
                    className="text-white font-black text-sm"
                    numberOfLines={1}
                  >
                    {farmer?.location ? farmer.location.split(",")[0] : "Buea"}
                  </Text>
                  <Text className="text-[#95D5B2] text-[9px] uppercase font-black tracking-wider mt-0.5">
                    Region
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Verification Status Card */}
          <View className="px-6 mb-5">
            {!farmer?.is_verified ? (
              <TouchableOpacity
                onPress={handleVerificationPress}
                className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex-row items-center justify-between"
              >
                <View className="flex-1 pr-3 flex-row items-center">
                  <View className="bg-orange-100 p-2.5 rounded-xl mr-3">
                    <Feather name="shield" size={18} color="#EA580C" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-orange-900 font-black text-xs uppercase tracking-wider">
                      Verify Identity
                    </Text>
                    <Text className="text-orange-700 text-[11px] font-medium mt-0.5">
                      Submit your National ID card photo to unlock instant
                      client orders.
                    </Text>
                  </View>
                </View>
                <Feather name="arrow-right" size={16} color="#EA580C" />
              </TouchableOpacity>
            ) : (
              <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex-row items-center">
                <View className="bg-emerald-100 p-2.5 rounded-xl mr-3">
                  <Feather name="shield" size={18} color="#059669" />
                </View>
                <View className="flex-1">
                  <Text className="text-emerald-900 font-black text-xs uppercase tracking-wider">
                    Verified Merchant
                  </Text>
                  <Text className="text-emerald-700 text-[11px] font-medium mt-0.5">
                    Identity check authorized. Your products are prioritized in
                    local markets.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Quick Actions Links */}
          <View className="px-6 flex-row mb-6">
            <QuickLink
              icon="shopping-bag"
              label="My Orders"
              subtitle="Manage Orders"
              accent="#2D6A4F"
              onPress={() => router.push("/farmer/orders")}
            />
            <QuickLink
              icon="sliders"
              label="Dashboard"
              subtitle="Harvest Insights"
              accent="#1B4332"
              onPress={() => router.push("/farmer/dashboard")}
            />
          </View>

          {/* Menu Options */}
          <View className="px-6 pb-8">
            <View className="bg-white rounded-[28px] px-5 py-2 border border-[#D8F3DC] shadow-sm">
              <MenuRow
                icon="user"
                label="Edit Profile"
                subtitle="Name, Location, Bio"
                onPress={() =>
                  router.push({
                    pathname: "/farmer/edit-profile",
                    params: { name: farmer?.full_name, loc: farmer?.location },
                  })
                }
              />
              <MenuRow
                icon="shield"
                label="Identity Check"
                subtitle="ID & Selfie Status"
                onPress={handleVerificationPress}
                rightText={verificationStatus}
              />
              <MenuRow
                icon="log-out"
                label="Sign Out"
                onPress={() => logout()}
                danger
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Identity Verification Sheet Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-[40px] p-6 max-h-[85%] border-t border-[#D8F3DC]">
            <View className="w-12 h-1 bg-[#D8F3DC] rounded-full self-center mb-5" />
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-[#1B4332] text-xl font-black tracking-tight">
                  Identity Check
                </Text>
                <Text className="text-[#52B788] text-xs font-semibold">
                  Verify to open customer chat channels
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                className="bg-[#F0FAF4] p-2 rounded-full border border-[#D8F3DC]"
              >
                <Feather name="x" size={18} color="#1B4332" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mb-5">
                <Text className="text-[#1B4332] font-extrabold text-sm mb-2">
                  1. National ID Card Photo
                </Text>
                <TouchableOpacity
                  onPress={() => pickImage("id")}
                  className={`h-36 rounded-2xl border-2 border-dashed items-center justify-center bg-[#F8FDF9] overflow-hidden ${
                    idPhoto ? "border-[#52B788]" : "border-[#D8F3DC]"
                  }`}
                >
                  {idPhoto ? (
                    <Image
                      source={{ uri: idPhoto }}
                      className="w-full h-full"
                      style={{ resizeMode: "cover" }}
                    />
                  ) : (
                    <View className="items-center px-4">
                      <Feather
                        name="credit-card"
                        size={24}
                        color="#52B788"
                        style={{ marginBottom: 8 }}
                      />
                      <Text className="text-[#2D6A4F] text-xs font-bold mt-1">
                        Snap ID card front side
                      </Text>
                      <Text className="text-[#95D5B2] text-[10px] text-center mt-0.5">
                        Ensure text details are readable
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View className="mb-6">
                <Text className="text-[#1B4332] font-extrabold text-sm mb-2">
                  2. Verification Selfie
                </Text>
                <TouchableOpacity
                  onPress={() => pickImage("selfie")}
                  className={`h-36 rounded-2xl border-2 border-dashed items-center justify-center bg-[#F8FDF9] overflow-hidden ${
                    selfiePhoto ? "border-[#52B788]" : "border-[#D8F3DC]"
                  }`}
                >
                  {selfiePhoto ? (
                    <Image
                      source={{ uri: selfiePhoto }}
                      className="w-full h-full"
                      style={{ resizeMode: "cover" }}
                    />
                  ) : (
                    <View className="items-center px-4">
                      <Feather
                        name="camera"
                        size={24}
                        color="#52B788"
                        style={{ marginBottom: 8 }}
                      />
                      <Text className="text-[#2D6A4F] text-xs font-bold mt-1">
                        Take selfie holding your ID
                      </Text>
                      <Text className="text-[#95D5B2] text-[10px] text-center mt-0.5">
                        Hold your card next to your face clearly
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleUploadVerification}
                disabled={isSubmitting}
                className={`w-full py-4 rounded-2xl items-center justify-center shadow-sm mb-6 ${
                  isSubmitting ? "bg-[#52B788]" : "bg-[#1B4332]"
                }`}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-black text-sm uppercase tracking-wider">
                    Submit to Management
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
