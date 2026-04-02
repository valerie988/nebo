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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
              <Text className="text-white text-[44px] font-[800]">
                Yooo! 👋
              </Text>
              <Text className="text-white text-lg mt-2 opacity-85">
                Welcome Back to Ne<Text className="text-tertiary">Bo</Text>
              </Text>
            </View>

            {/* White card */}
            <View className="flex-1 bg-white rounded-t-[60px] px-8 pt-11 pb-10">
              <Text className="text-primary text-[34px] font-[800] mb-8 ml-1">
                Login
              </Text>

              {/* Email */}
              <View className="bg-secondary rounded-full flex-row items-center px-6 py-[18px] mb-4">
                <Ionicons name="mail-outline" size={22} color="#1B7344" />
                <TextInput
                  className="flex-1 ml-[14px] text-primary font-semibold text-base"
                  placeholder="Email"
                  placeholderTextColor="#74B88A"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Password */}
              <View className="bg-secondary rounded-full flex-row items-center px-6 py-[18px] mb-[10px]">
                <Ionicons name="lock-closed-outline" size={22} color="#1B7344" />
                <TextInput
                  className="flex-1 ml-[14px] text-primary font-semibold text-base"
                  placeholder="Password"
                  placeholderTextColor="#74B88A"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#1B7344"
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot password */}
              <TouchableOpacity className="self-end mr-1 mb-8">
                <Text className="text-primary font-bold text-[13px]">
                  Forgot Password?
                </Text>
              </TouchableOpacity>

              {/* Login button */}
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/(farmer-tabs)/home")}
                activeOpacity={0.85}
                className="bg-primary rounded-full py-[18px] items-center shadow-lg elevation-8"
                style={{
                  shadowColor: "#1B7344",
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                }}
              >
                <Text className="text-white text-xl font-[800]">
                  Login
                </Text>
              </TouchableOpacity>

              {/* Sign up footer */}
              <View className="flex-row justify-center mt-9 mb-2">
                <Text className="text-primary font-medium text-sm">
                  Dont have an account?{" "}
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