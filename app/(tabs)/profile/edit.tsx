import { useAuth } from "@/components/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = "http://172.20.10.2:8000";

export default function EditProfileScreen() {
  const [image, setImage] = useState<string | null>(null);

  // Function to handle image picking
  const pickImage = async () => {
    // Request permission first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need gallery access to change your photo.",
      );
      return;
    }

    // Launch the picker
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], // Updated for newer expo versions
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5, // Lower quality for faster upload
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      // You would typically upload this to the backend here
    }
  };
  const { token } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    location: "",
    email: "", // Read-only
    role: "", // Read-only
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCurrentData = async () => {
      try {
        const fullUrl = `${API_URL}/auth/me`;
        console.log("Fetching from:", fullUrl); // DEBUG 1: Check the URL
        console.log("Using Token:", token ? "Yes" : "No"); // DEBUG 2: Check token

        const res = await fetch(fullUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        const data = await res.json();

        if (res.ok) {
          setForm({
            full_name: data.full_name || "",
            phone: data.phone || "",
            location: data.location || "",
            email: data.email || "",
            role: data.role || "",
          });
        } else {
          console.error("Server Error Response:", data); // DEBUG 3: See backend error
          Alert.alert("Error", `Server returned ${res.status}`);
        }
      } catch (err) {
        console.error("Fetch Error:", err); // DEBUG 4: Check for Network Error
        Alert.alert("Error", "Check terminal for network error details");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchCurrentData();
  }, [token]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/update`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: form.full_name,
          phone: form.phone,
          location: form.location,
        }),
      });

      if (res.ok) {
        Alert.alert("Success", "Profile updated!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Update Failed", "Check your inputs.");
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      Alert.alert("Error", "Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <View className="flex-1 items-center justify-center bg-[#F0FAF4]">
        <ActivityIndicator color="#1B4332" />
      </View>
    );

  return (
    <View className="flex-1 bg-[#F0FAF4]">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header with Back Arrow */}
        <View className="flex-row items-center px-6 py-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm"
          >
            <Ionicons name="arrow-back" size={20} color="#1B4332" />
          </TouchableOpacity>
          <Text className="ml-4 text-[#1B4332] text-xl font-black">
            Edit Profile
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="px-6">
          {/* Profile Image Section */}
          <View className="items-center my-6">
            <View className="relative">
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                <View className="w-24 h-24 rounded-full bg-[#D8F3DC] items-center justify-center border-4 border-white shadow-md overflow-hidden">
                  {image ? (
                    <Image source={{ uri: image }} className="w-full h-full" />
                  ) : (
                    <Text className="text-4xl">👤</Text>
                  )}
                </View>
                <View className="absolute bottom-0 right-0 bg-[#1B4332] p-2 rounded-full border-2 border-white">
                  <Ionicons name="camera" size={16} color="white" />
                </View>
              </TouchableOpacity>
            </View>
            <Text className="text-[#1B4332] font-bold mt-2">Change Photo</Text>
          </View>

          {/* Editable Fields */}
          <SectionLabel label="Personal Information" />
          <InputField
            icon="person-outline"
            label="Full Name"
            value={form.full_name}
            onChangeText={(t: any) => setForm({ ...form, full_name: t })}
          />

          <InputField
            icon="call-outline"
            label="Phone Number"
            value={form.phone}
            keyboardType="phone-pad"
            onChangeText={(t: any) => setForm({ ...form, phone: t })}
          />

          <InputField
            icon="location-outline"
            label="Location"
            value={form.location}
            onChangeText={(t: any) => setForm({ ...form, location: t })}
          />

          {/* Read Only Fields */}
          <SectionLabel label="Account Details (Read Only)" />
          <ReadOnlyField
            icon="mail-outline"
            label="Email Address"
            value={form.email}
          />
          <ReadOnlyField
            icon="briefcase-outline"
            label="Account Role"
            value={form.role}
          />

          <TouchableOpacity
            onPress={handleUpdate}
            disabled={saving}
            className={`mt-8 mb-10 py-4 rounded-2xl items-center shadow-lg ${saving ? "bg-gray-400" : "bg-[#1B4332]"}`}
          >
            <Text className="text-white font-black text-lg">
              {saving ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// --- Internal UI Components ---

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="text-[#95D5B2] text-[10px] font-black uppercase tracking-widest mt-4 mb-3 ml-1">
      {label}
    </Text>
  );
}

function InputField({ label, icon, ...props }: any) {
  return (
    <View className="mb-4 bg-white rounded-2xl p-4 flex-row items-center border border-[#D8F3DC] shadow-sm">
      <Ionicons
        name={icon}
        size={20}
        color="#40916C"
        style={{ marginRight: 12 }}
      />
      <View className="flex-1">
        <Text className="text-[#95D5B2] text-[9px] font-bold uppercase mb-1">
          {label}
        </Text>
        <TextInput
          className="text-[#1B4332] font-bold p-0 m-0"
          placeholderTextColor="#D8F3DC"
          {...props}
        />
      </View>
    </View>
  );
}

function ReadOnlyField({ label, icon, value }: any) {
  return (
    <View className="mb-4 bg-[#F8FDFB] rounded-2xl p-4 flex-row items-center border border-[#E8F5E9] opacity-70">
      <Ionicons
        name={icon}
        size={20}
        color="#95D5B2"
        style={{ marginRight: 12 }}
      />
      <View className="flex-1">
        <Text className="text-[#95D5B2] text-[9px] font-bold uppercase mb-1">
          {label}
        </Text>
        <Text className="text-[#52B788] font-bold">{value || "N/A"}</Text>
      </View>
      <Ionicons name="lock-closed" size={12} color="#D8F3DC" />
    </View>
  );
}
