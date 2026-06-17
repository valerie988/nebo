import { useAuth } from "@/components/context/AuthContext";
import { authService } from "@/components/services/authService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!identity.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await authService.login({
        identity: identity.trim(), // renamed from 'email', role dropped
        password,
      });

      console.log("LOGIN RESPONSE:", res);

      if (res.access_token && res.user_id) {
        await login(res.access_token, res.role, { id: res.user_id });

        console.log("AUTH CONTEXT UPDATED");

        setLoading(false); // clear spinner before navigation

        router.replace(
          res.role === "farmer"
            ? "/(tabs)/(farmer-tabs)/home"
            : "/(tabs)/(customer-tabs)/home",
        );
      }
    } catch (err: any) {
      setLoading(false);

      if (err.response) {
        console.log("SERVER ERROR:", err.response.data);
        setError(err.response.data.detail || "Authentication failed");
      } else if (err.request) {
        console.log("NETWORK ERROR:", err.request);
        setError("Cannot connect to server. Check your internet.");
      } else {
        console.log("REQUEST ERROR:", err.message);
        setError("Error: " + err.message);
      }
    }
  };

  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="px-10 pt-12 pb-10">
              <Text className="text-white text-[44px] font-[800]">
                Welcome 
              </Text>
            </View>

            <View className="flex-1 bg-white rounded-t-[60px] px-8 pt-11 pb-10">
              <Text className="text-primary text-[34px] font-[800] mb-8">
                Login
              </Text>

              {error ? (
                <View className="bg-red-50 p-3 rounded-xl mb-4 border border-red-100">
                  <Text className="text-red-600 text-center text-sm">
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Identity field — email or phone */}
              <View className="bg-secondary rounded-full flex-row items-center px-6 py-[18px] mb-4">
                <Ionicons name="person-outline" size={22} color="#1B7344" />
                <TextInput
                  className="flex-1 ml-[14px] text-primary font-semibold"
                  placeholder="Email or Phone Number"
                  placeholderTextColor="#74B88A"
                  value={identity}
                  onChangeText={(t) => {
                    setIdentity(t);
                    setError("");
                  }}
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false} // prevents autocorrect mangling phone/email
                />
              </View>

              {/* Password field */}
              <View className="bg-secondary rounded-full flex-row items-center px-6 py-[18px] mb-[10px]">
                <Ionicons name="lock-closed-outline" size={22} color="#1B7344" />
                <TextInput
                  className="flex-1 ml-[14px] text-primary font-semibold"
                  placeholder="Password"
                  placeholderTextColor="#74B88A"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setError("");
                  }}
                  autoCorrect={false} // prevent autocorrect on password
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#1B7344"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                className="bg-primary rounded-full py-[18px] items-center mt-12"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-xl font-[800]">Login</Text>
                )}
              </TouchableOpacity>

              <View className="flex-row justify-center mt-9 mb-2">
                <Text className="text-primary font-medium text-sm">
                  Don't have an account?{" "}
                </Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
                  <Text className="text-accent font-[800] text-sm">
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}