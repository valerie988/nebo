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
  // Ensure 'login' is destructured from your AuthContext
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      setLoading(true);

      const res = await authService.login({
        email: email.trim(),
        password,
        role: "customer",
      });

      console.log("LOGIN RESPONSE:", res);

      if (res.access_token && res.user_id) {
        await login(res.access_token, res.role, { id: res.user_id });

        console.log("AUTH CONTEXT UPDATED");

        router.replace(
          res.role === "farmer"
            ? "/(tabs)/(farmer-tabs)/home"
            : "/(tabs)/(customer-tabs)/home",
        );
      }
    } catch (err: any) {
      setLoading(false); // Make sure to stop loading

      if (err.response) {
        // The server responded with a status code outside the 2xx range
        console.log("SERVER ERROR:", err.response.data);
        setError(err.response.data.detail || "Authentication failed");
      } else if (err.request) {
        // The request was made but no response was received
        console.log("NETWORK ERROR (No response):", err.request);
        setError("Cannot connect to server. Check your internet.");
      } else {
        // Something happened in setting up the request
        console.log("REQUEST SETUP ERROR:", err.message);
        setError("Error: " + err.message);
      }
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
          >
            <View className="px-10 pt-12 pb-10">
              <Text className="text-white text-[44px] font-[800]">
                Yooo! 👋
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

              <View className="bg-secondary rounded-full flex-row items-center px-6 py-[18px] mb-4">
                <Ionicons name="mail-outline" size={22} color="#1B7344" />
                <TextInput
                  className="flex-1 ml-[14px] text-primary font-semibold"
                  placeholder="Email"
                  placeholderTextColor="#74B88A"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setError("");
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View className="bg-secondary rounded-full flex-row items-center px-6 py-[18px] mb-[10px]">
                <Ionicons
                  name="lock-closed-outline"
                  size={22}
                  color="#1B7344"
                />
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
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
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
                className="bg-primary rounded-full py-[18px] items-center"
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
