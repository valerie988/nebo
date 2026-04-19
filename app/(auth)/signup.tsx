import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Internal Imports
import { FieldInput, PasswordInput } from "@/components/auth/AuthUI";
import { useAuth } from "@/components/context/AuthContext";
import { authService } from "@/components/services/authService";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface FormProps {
  values: Record<string, string>;
  onChange: (field: string, val: string) => void;
  errors: Record<string, string>;
}

// ─── FARMER FORM ──────────────────────────────────────────────────────────────
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
      <FieldInput
        placeholder="Location / region"
        value={values.location}
        onChangeText={(v) => onChange("location", v)}
        autoCapitalize="words"
        error={errors.location}
        icon={<Ionicons name="location-outline" size={22} color="#1B7344" />}
      />
      <PasswordInput
        placeholder="Password"
        value={values.password}
        onChangeText={(v) => onChange("password", v)}
        error={errors.password}
      />
    </>
  );
}

//  CUSTOMER FORM 
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
      <PasswordInput
        placeholder="Password"
        value={values.password}
        onChangeText={(v) => onChange("password", v)}
        error={errors.password}
      />
    </>
  );
}

// ─── SIGNUP SCREEN ────────────────────────────────────────────────────────────
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
    if (!values.full_name.trim()) newErrors.full_name = "Full name is required.";
    if (!values.email.trim()) newErrors.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(values.email)) newErrors.email = "Enter a valid email.";
    if (!values.phone.trim()) newErrors.phone = "Phone number is required.";
    if (role === "farmer" && !values.location.trim()) newErrors.location = "Location is required.";
    if (!values.password.trim()) newErrors.password = "Password is required.";
    else if (values.password.length < 8) newErrors.password = "Password must be at least 8 characters.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
const handleSignup = async () => {
  setGlobalError("");
  if (!validate()) return;
  
  try {
    setLoading(true);
    
    // Call the unified signup service
    const res = await authService.signup({
      full_name: values.full_name,
      email: values.email,
      phone: values.phone,
      location: role === "farmer" ? values.location : "Customer Location", 
      password: values.password,
      role: role, // "farmer" or "customer"
    });
    await login(res.access_token, res.role);
    
    // Optional: Redirect or show success
    router.replace("/(auth)/login"); 
    
  } catch (err: any) {
    setGlobalError(err.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <View className="flex-1 bg-[#1B4332]">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View className="px-10 pt-9 pb-8">
              <Text className="text-white text-[38px] font-[800]">Hello! 👋</Text>
              <Text className="text-white text-[17px] mt-1 opacity-80">
                Create your Ne<Text className="text-[#FF9F1C]">Bo</Text> account
              </Text>
            </View>

            {/* White Card */}
            <View className="flex-1 bg-white rounded-t-[60px] px-8 pt-9 pb-10">
              <Text className="text-primary text-3xl font-[800] mb-5 ml-1">Sign Up</Text>

              {/* Role Toggle */}
              <View className="flex-row bg-secondary rounded-full p-1 mb-6">
                {(["customer", "farmer"] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => {
                      setRole(r);
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

              {/* Form Content */}
              {role === "farmer" ? (
                <FarmerForm values={values} onChange={handleChange} errors={errors} />
              ) : (
                <CustomerForm values={values} onChange={handleChange} errors={errors} />
              )}

              {/* Error Message */}
              {globalError ? (
                <View className="bg-red-50 rounded-xl px-4 py-3 mb-3">
                  <Text className="text-red-600 text-[13px]">{globalError}</Text>
                </View>
              ) : null}

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.85}
                className={`bg-primary rounded-full py-[18px] items-center mt-2 shadow-lg elevation-8 ${
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

              {/* Footer */}
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