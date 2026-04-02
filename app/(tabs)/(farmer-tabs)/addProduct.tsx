import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Veggies", "Fruits", "Grains", "Herbs", "Roots", "Dairy", "Other",
];

const UNITS = ["kg", "g", "bunch", "piece", "cob", "litre", "bag", "crate"];

const DRAFT_KEY = "nebo_add_product_draft";
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProductForm {
  name: string;
  category: string;
  price: string;
  unit: string;
  quantity: string;
  description: string;
  location: string;
  photos: string[]; // local URIs
}

const EMPTY_FORM: ProductForm = {
  name: "",
  category: "",
  price: "",
  unit: "kg",
  quantity: "",
  description: "",
  location: "",
  photos: [],
};

// ─── Field Input ──────────────────────────────────────────────────────────────
function Field({
  label,
  error,
  children,
  required,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <View className="mb-5">
      <Text className="text-[#1B4332] font-semibold text-sm mb-1.5">
        {label}
        {required && <Text className="text-red-400"> *</Text>}
      </Text>
      {children}
      {error ? (
        <Text className="text-red-500 text-xs mt-1">{error}</Text>
      ) : null}
    </View>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  numberOfLines,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  multiline?: boolean;
  numberOfLines?: number;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#B7E4C7"
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={numberOfLines}
      className="bg-white rounded-2xl px-4 py-3.5 text-[#1B4332] text-sm border border-[#D8F3DC]"
      style={multiline ? { height: 90, textAlignVertical: "top" } : {}}
    />
  );
}

// ─── Pill Selector ────────────────────────────────────────────────────────────
function PillSelector({
  options,
  value,
  onSelect,
}: {
  options: string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          onPress={() => onSelect(opt)}
          activeOpacity={0.8}
          className="rounded-full px-4 py-2"
          style={{
            backgroundColor: value === opt ? "#1B4332" : "#fff",
            borderWidth: 1,
            borderColor: value === opt ? "#1B4332" : "#D8F3DC",
          }}
        >
          <Text
            className="text-sm font-semibold"
            style={{ color: value === opt ? "#fff" : "#1B4332" }}
          >
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Add Product Screen ───────────────────────────────────────────────────────
export default function AddProductScreen() {
  const router = useRouter();
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<ProductForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // Load draft on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (raw) {
          const draft = JSON.parse(raw);
          setForm(draft);
        }
      } catch {}
    })();
  }, []);

  const update = (field: keyof ProductForm, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  // ─── Save draft ─────────────────────────────────────────────────────────────
  const saveDraft = async () => {
    try {
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    } catch {
      Alert.alert("Error", "Could not save draft.");
    }
  };

  // ─── Photo picker ────────────────────────────────────────────────────────────
  const pickPhoto = async (source: "camera" | "gallery") => {
    if (form.photos.length >= 4) {
      Alert.alert("Limit reached", "You can add up to 4 photos.");
      return;
    }

    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", `Please allow ${source} access.`);
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });

    if (!result.canceled && result.assets[0]) {
      update("photos", [...form.photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    update("photos", form.photos.filter((_, i) => i !== index));
  };

  const showPhotoPicker = () => {
    Alert.alert("Add photo", "Choose a source", [
      { text: "Camera", onPress: () => pickPhoto("camera") },
      { text: "Gallery", onPress: () => pickPhoto("gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // ─── Validate ────────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Partial<Record<keyof ProductForm, string>> = {};
    if (!form.name.trim()) e.name = "Product name is required.";
    if (!form.category) e.category = "Please select a category.";
    if (!form.price.trim()) e.price = "Price is required.";
    else if (isNaN(Number(form.price))) e.price = "Price must be a number.";
    if (!form.quantity.trim()) e.quantity = "Quantity is required.";
    else if (isNaN(Number(form.quantity))) e.quantity = "Quantity must be a number.";
    if (!form.location.trim()) e.location = "Location is required.";
    setErrors(errors);
    return Object.keys(e).length === 0;
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      // Check if online
      let isOnline = false;
      try {
        const ping = await fetch(`${BASE_URL}/health`, { method: "HEAD" });
        isOnline = ping.ok;
      } catch {}

      if (!isOnline) {
        // Save as pending draft
        await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, _pending: true }));
        Alert.alert(
          "Saved offline 📦",
          "Your product has been saved. It will be submitted automatically when you're back online.",
          [{ text: "OK", onPress: () => router.back() }]
        );
        return;
      }

      // Build form data (multipart for photos)
      const token = await AsyncStorage.getItem("nebo_token");
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("category", form.category);
      formData.append("price", form.price);
      formData.append("unit", form.unit);
      formData.append("quantity", form.quantity);
      formData.append("description", form.description.trim());
      formData.append("location", form.location.trim());

      form.photos.forEach((uri, i) => {
        const ext = uri.split(".").pop() ?? "jpg";
        formData.append("photos", {
          uri,
          name: `photo_${i}.${ext}`,
          type: `image/${ext}`,
        } as any);
      });

      const res = await fetch(`${BASE_URL}/products`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Server error");

      // Clear draft on success
      await AsyncStorage.removeItem(DRAFT_KEY);
      Alert.alert("Product listed! 🌿", "Your product is now live on the marketplace.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F0FAF4]">
      <SafeAreaView className="flex-1">

        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-5 pb-4">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <Text className="text-[#1B4332] text-2xl font-bold">‹</Text>
            </TouchableOpacity>
            <Text className="text-[#1B4332] text-2xl font-black" style={{ letterSpacing: -0.5 }}>
              Add Product
            </Text>
          </View>

          {/* Save draft button */}
          <TouchableOpacity
            onPress={saveDraft}
            activeOpacity={0.8}
            className="bg-white rounded-xl px-4 py-2 border border-[#D8F3DC]"
          >
            <Text className="text-[#1B4332] text-xs font-semibold">
              {draftSaved ? "✓ Saved" : "Save draft"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >

          {/* Photos section */}
          <View className="mb-6">
            <Text className="text-[#1B4332] font-semibold text-sm mb-3">
              Photos <Text className="text-[#95D5B2] font-normal">(up to 4)</Text>
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {/* Add photo button */}
              {form.photos.length < 4 && (
                <TouchableOpacity
                  onPress={showPhotoPicker}
                  activeOpacity={0.8}
                  className="bg-white rounded-2xl items-center justify-center border border-dashed border-[#B7E4C7]"
                  style={{ width: 100, height: 100 }}
                >
                  <Text className="text-3xl">📷</Text>
                  <Text className="text-[#95D5B2] text-xs mt-1">Add photo</Text>
                </TouchableOpacity>
              )}

              {/* Photo previews */}
              {form.photos.map((uri, i) => (
                <View key={i} style={{ width: 100, height: 100 }}>
                  <Image
                    source={{ uri }}
                    className="rounded-2xl"
                    style={{ width: 100, height: 100 }}
                  />
                  <TouchableOpacity
                    onPress={() => removePhoto(i)}
                    className="absolute top-1 right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center"
                  >
                    <Text className="text-white text-xs font-bold">×</Text>
                  </TouchableOpacity>
                  {i === 0 && (
                    <View className="absolute bottom-1 left-1 bg-[#1B4332] rounded-full px-1.5 py-0.5">
                      <Text className="text-white text-xs">Cover</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Form card */}
          <View className="bg-white rounded-3xl px-5 pt-5 pb-6 border border-[#D8F3DC]">

            {/* Product name */}
            <Field label="Product name" error={errors.name} required>
              <Input
                value={form.name}
                onChangeText={(v) => update("name", v)}
                placeholder="e.g. Fresh Roma Tomatoes"
              />
            </Field>

            {/* Category */}
            <Field label="Category" error={errors.category} required>
              <PillSelector
                options={CATEGORIES}
                value={form.category}
                onSelect={(v) => update("category", v)}
              />
              {errors.category ? (
                <Text className="text-red-500 text-xs mt-1">{errors.category}</Text>
              ) : null}
            </Field>

            {/* Price + Unit */}
            <Field label="Price & unit" error={errors.price} required>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <TextInput
                    value={form.price}
                    onChangeText={(v) => update("price", v)}
                    placeholder="e.g. 500"
                    placeholderTextColor="#B7E4C7"
                    keyboardType="numeric"
                    className="bg-[#F0FAF4] rounded-2xl px-4 py-3.5 text-[#1B4332] text-sm border border-[#D8F3DC]"
                  />
                  <Text className="text-[#95D5B2] text-xs mt-1 ml-1">XAF</Text>
                </View>
                <View className="flex-1">
                  <PillSelector
                    options={UNITS}
                    value={form.unit}
                    onSelect={(v) => update("unit", v)}
                  />
                </View>
              </View>
            </Field>

            {/* Quantity */}
            <Field label="Quantity available" error={errors.quantity} required>
              <View className="flex-row items-center gap-3">
                <View className="flex-1">
                  <Input
                    value={form.quantity}
                    onChangeText={(v) => update("quantity", v)}
                    placeholder="e.g. 50"
                    keyboardType="numeric"
                  />
                </View>
                <Text className="text-[#52B788] font-semibold text-sm">{form.unit}</Text>
              </View>
            </Field>

            {/* Description */}
            <Field label="Description">
              <Input
                value={form.description}
                onChangeText={(v) => update("description", v)}
                placeholder="Describe your product — freshness, harvest date, etc."
                multiline
                numberOfLines={4}
              />
            </Field>

            {/* Location */}
            <Field label="Location" error={errors.location} required>
              <Input
                value={form.location}
                onChangeText={(v) => update("location", v)}
                placeholder="e.g. Bafoussam, West Region"
              />
            </Field>

          </View>

          {/* Submit button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
            className="rounded-2xl py-4 items-center mt-5"
            style={{
              backgroundColor: submitting ? "#95D5B2" : "#1B4332",
              shadowColor: "#1B4332",
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">
                List Product 🌿
              </Text>
            )}
          </TouchableOpacity>

          {/* Offline note */}
          <Text className="text-center text-[#95D5B2] text-xs mt-3">
            No internet? Your product will be saved and submitted automatically when you're back online.
          </Text>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}