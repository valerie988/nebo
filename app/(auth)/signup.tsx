import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Internal Imports
import { FieldInput, PasswordInput } from "@/components/auth/AuthUI";
import { useAuth } from "@/components/context/AuthContext";
import { authService } from "@/components/services/authService";

// ─── GEOGRAPHIC DATA CONSTANTS
export const CAMEROON_REGIONS = [
  { value: "Adamawa", label: "Adamawa" },
  { value: "Centre", label: "Centre" },
  { value: "East", label: "East" },
  { value: "Far North", label: "Far North" },
  { value: "Littoral", label: "Littoral" },
  { value: "North", label: "North" },
  { value: "North West", label: "North West" },
  { value: "South", label: "South" },
  { value: "South West", label: "South West" },
  { value: "West", label: "West" },
];

interface FormProps {
  values: Record<string, string>;
  onChange: (field: string, val: string) => void;
  errors: Record<string, string>;
}

interface LocationPickerProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

// ─── STREAMLINED LOCATION PICKER
export function LocationPicker({
  value,
  onChange,
  placeholder = "Select your region",
}: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = CAMEROON_REGIONS.find((r) => r.value === value);

  return (
    <View>
      {/* Trigger Button */}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#fff",
          borderWidth: 1.5,
          borderColor: value ? "#52B788" : "#D8F3DC",
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 16,
          height: 56, // Match typical FieldInput height
        }}
      >
        <Text
          style={{
            color: value ? "#1B4332" : "#95D5B2",
            fontSize: 15,
            fontWeight: "500",
          }}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color="#52B788"
        />
      </TouchableOpacity>

      {/* Selector Modal Overlay */}
      <Modal visible={open} transparent animationType="slide">
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-end",
          }}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              maxHeight: "60%",
            }}
          >
            {/* Modal Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                paddingHorizontal: 4,
              }}
            >
              <Text
                style={{ color: "#1B4332", fontWeight: "800", fontSize: 18 }}
              >
                Select Region
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={24} color="#95D5B2" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {CAMEROON_REGIONS.map((region) => (
                <TouchableOpacity
                  key={region.value}
                  onPress={() => {
                    onChange(region.value);
                    setOpen(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 6,
                    backgroundColor:
                      value === region.value ? "#F0FAF4" : "transparent",
                    borderWidth: value === region.value ? 1 : 0,
                    borderColor: "#D8F3DC",
                  }}
                >
                  <Text
                    style={{
                      color: value === region.value ? "#1B4332" : "#374151",
                      fontWeight: value === region.value ? "700" : "500",
                      fontSize: 15,
                    }}
                  >
                    {region.label}
                  </Text>
                  {value === region.value && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#52B788"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── SUB-COMPONENT: FARMER CORE FORM FIELDS
function FarmerForm({ values, onChange, errors }: FormProps) {
  return (
    <>
      <FieldInput
        placeholder="Full name"
        value={values.full_name}
        onChangeText={(v) => onChange("full_name", v)}
        autoCapitalize="words"
        error={errors.full_name}
        icon={<Ionicons name="person-outline" size={22} color="#1B7344" />}
      />
      <FieldInput
        placeholder="Email"
        value={values.email}
        onChangeText={(v) => onChange("email", v)}
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
        icon={<Ionicons name="mail-outline" size={22} color="#1B7344" />}
      />
      <FieldInput
        placeholder="Phone number"
        value={values.phone}
        onChangeText={(v) => onChange("phone", v)}
        keyboardType="phone-pad"
        error={errors.phone}
        icon={<Ionicons name="call-outline" size={22} color="#1B7344" />}
      />
      <View className="mb-4">
        <LocationPicker
          value={values.location}
          onChange={(v) => onChange("location", v)}
          placeholder="Select farm region"
        />
        {errors.location ? (
          <Text className="text-red-500 text-xs mt-1 ml-1">
            {errors.location}
          </Text>
        ) : null}
      </View>
      <PasswordInput
        placeholder="Password"
        value={values.password}
        onChangeText={(v) => onChange("password", v)}
        error={errors.password}
      />
    </>
  );
}

// ─── SUB-COMPONENT: CUSTOMER CORE FORM FIELDS
function CustomerForm({ values, onChange, errors }: FormProps) {
  return (
    <>
      <FieldInput
        placeholder="Full name"
        value={values.full_name}
        onChangeText={(v) => onChange("full_name", v)}
        autoCapitalize="words"
        error={errors.full_name}
        icon={<Ionicons name="person-outline" size={22} color="#1B7344" />}
      />
      <FieldInput
        placeholder="Email"
        value={values.email}
        onChangeText={(v) => onChange("email", v)}
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
        icon={<Ionicons name="mail-outline" size={22} color="#1B7344" />}
      />
      <FieldInput
        placeholder="Phone number"
        value={values.phone}
        onChangeText={(v) => onChange("phone", v)}
        keyboardType="phone-pad"
        error={errors.phone}
        icon={<Ionicons name="call-outline" size={22} color="#1B7344" />}
      />
      <View className="mb-4">
        <LocationPicker
          value={values.location}
          onChange={(v) => onChange("location", v)}
          placeholder="Select your region"
        />
        {errors.location ? (
          <Text className="text-red-500 text-xs mt-1 ml-1">
            {errors.location}
          </Text>
        ) : null}
      </View>
      <PasswordInput
        placeholder="Password"
        value={values.password}
        onChangeText={(v) => onChange("password", v)}
        error={errors.password}
      />
    </>
  );
}

// ─── MAIN CONTAINER ENTRYPOINT
export default function SignupScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [role, setRole] = useState<"farmer" | "customer">("customer");
  const [values, setValues] = useState<Record<string, string>>({
    full_name: "",
    email: "",
    phone: "",
    location: "",
    password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, val: string) => {
    setValues((prev) => ({ ...prev, [field]: val }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!values.full_name.trim())
      newErrors.full_name = "Full name is required.";
    if (!values.email.trim()) newErrors.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(values.email))
      newErrors.email = "Enter a valid email.";
    if (!values.phone.trim()) newErrors.phone = "Phone number is required.";
    if (!values.location.trim())
      newErrors.location = "Location selection is required.";
    if (!values.password.trim()) newErrors.password = "Password is required.";
    else if (values.password.length < 8)
      newErrors.password = "Password must be at least 8 characters.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    setGlobalError("");
    if (!validate()) return;

    try {
      setLoading(true);

      const res = await authService.signup({
        full_name: values.full_name,
        email: values.email,
        phone: values.phone,
        location: values.location,
        password: values.password,
        role: role,
      });

      await login(res.access_token, res.role, { id: res.user_id });
      router.replace("/(auth)/login");
    } catch (err: any) {
      setGlobalError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#1B4332]">
      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            {/* Branding Header Area */}
            <View className="px-10 pt-9 pb-8">
              <Text className="text-white text-[38px] font-[800]">
                Hello! 
              </Text>
              <Text className="text-white text-[17px] mt-1 opacity-80">
                Create your Ne<Text className="text-[#FF9F1C]">Bo</Text> account
              </Text>
            </View>

            {/* Input Action Sheet Interface Panel */}
            <View className="flex-1 bg-white rounded-t-[60px] px-8 pt-12 pb-6">
              <Text className="text-primary text-3xl font-[800] mb-5 ml-1">
                Sign Up
              </Text>

              {/* Identity/Role Toggle Controls */}
              <View className="flex-row bg-secondary rounded-full p-1 mb-6">
                {(["customer", "farmer"] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => {
                      setRole(r);
                      setValues({
                        full_name: "",
                        email: "",
                        phone: "",
                        location: "",
                        password: "",
                      });
                      setErrors({});
                      setGlobalError("");
                    }}
                    activeOpacity={0.8}
                    className={`flex-1 py-3 rounded-full items-center ${
                      role === r ? "bg-primary" : "bg-transparent"
                    }`}
                  >
                    <Text
                      className={`font-bold text-sm capitalize ${
                        role === r ? "text-white" : "text-primary"
                      }`}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Dynamic Sub-Form Render */}
              {role === "farmer" ? (
                <FarmerForm
                  values={values}
                  onChange={handleChange}
                  errors={errors}
                />
              ) : (
                <CustomerForm
                  values={values}
                  onChange={handleChange}
                  errors={errors}
                />
              )}

              {/* Error Output Feedback Panel */}
              {globalError ? (
                <View className="bg-red-50 rounded-xl px-4 py-3 mt-4 mb-1">
                  <Text className="text-red-600 text-[13px]">
                    {globalError}
                  </Text>
                </View>
              ) : null}

              {/* Form Dispatch Button Submission Trigger */}
              <TouchableOpacity
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.85}
                className={`bg-primary rounded-full py-[18px] items-center shadow-lg elevation-8 mt-10 ${
                  loading ? "opacity-70" : ""
                }`}
                style={{
                  shadowColor: "#1B7344",
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                }}
              >
                <Text className="text-white text-lg font-[800]">
                  {loading ? "Creating account..." : "Create Account"}
                </Text>
              </TouchableOpacity>

              {/* Screen Footer Anchor Redirect */}
              <View className="flex-row justify-center mt-7 mb-2">
                <Text className="text-primary font-medium text-sm">
                  Already have an account?{" "}
                </Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                  <Text className="text-accent font-[800] text-sm">Log in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
