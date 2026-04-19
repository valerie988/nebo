import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/components/context/AuthContext";
import { authService } from "@/components/services/authService";

export default function LoginScreen() {
  const router = useRouter();
  const { login: saveAuth } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
const handleLogin = async () => {
  try {
    setLoading(true);
    setError("");

    // We send the login request
    const res = await authService.login({ 
      email: email.trim(), 
      password: password,
      role: "customer" 
    });

    if (res.access_token) {
      await saveAuth(res.access_token, res.role);

      if (res.role === "farmer") {
        router.replace("/(tabs)/(farmer-tabs)/home");
      } else {
        router.replace("/(tabs)/(customer-tabs)/home");
      }
    }
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <View className="flex-1 bg-primary">
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
            <View className="px-10 pt-12 pb-10">
              <Text className="text-white text-[44px] font-[800]">Yooo! 👋</Text>
              <Text className="text-white text-lg mt-2 opacity-85">
                Welcome Back to Ne<Text className="text-tertiary">Bo</Text>
              </Text>
            </View>

            {/* White card */}
            <View className="flex-1 bg-white rounded-t-[60px] px-8 pt-11 pb-10">
              <Text className="text-primary text-[34px] font-[800] mb-8 ml-1">Login</Text>

              {/* Error Message Display */}
              {error ? (
                <View className="bg-red-50 p-3 rounded-xl mb-4 mx-1 border border-red-100">
                  <Text className="text-red-600 font-semibold text-center text-sm">{error}</Text>
                </View>
              ) : null}

              {/* Email Input */}
              <View className="bg-secondary rounded-full flex-row items-center px-6 py-[18px] mb-4">
                <Ionicons name="mail-outline" size={22} color="#1B7344" />
                <TextInput
                  className="flex-1 ml-[14px] text-primary font-semibold text-base"
                  placeholder="Email"
                  placeholderTextColor="#74B88A"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(""); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Password Input */}
              <View className="bg-secondary rounded-full flex-row items-center px-6 py-[18px] mb-[10px]">
                <Ionicons name="lock-closed-outline" size={22} color="#1B7344" />
                <TextInput
                  className="flex-1 ml-[14px] text-primary font-semibold text-base"
                  placeholder="Password"
                  placeholderTextColor="#74B88A"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(""); }}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#1B7344" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity className="self-end mr-1 mb-8">
                <Text className="text-primary font-bold text-[13px]">Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
                className={`bg-primary rounded-full py-[18px] items-center shadow-lg ${loading ? 'opacity-70' : ''}`}
                style={{ shadowColor: "#1B7344", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-xl font-[800]">Login</Text>
                )}
              </TouchableOpacity>

              {/* Sign up footer */}
              <View className="flex-row justify-center mt-9 mb-2">
                <Text className="text-primary font-medium text-sm">Dont have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
                  <Text className="text-accent font-[800] text-sm">Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}