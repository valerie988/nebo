import { AuthProvider, useAuth } from "@/components/context/AuthContext";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";

// Disable reanimated warnings
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

// @ts-ignore
import "../global.css";

function RootLayoutNav() {
  const { token, role, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

 useEffect(() => {
  console.log("ROOT NAV", {
    token,
    role,
    isLoading,
    segments,
  });

  if (isLoading) return;

  const inAuthGroup = segments[0] === "(auth)";

  if (!token) {
    if (!inAuthGroup) {
      router.replace("/(auth)/login");
    }
    return;
  }

  if (inAuthGroup) {
    const homePath =
      role === "farmer"
        ? "/(tabs)/(farmer-tabs)/home"
        : "/(tabs)/(customer-tabs)/home";

    router.replace(homePath as any);
  }
}, [token, role, isLoading, segments]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FDF9]">
        <ActivityIndicator size="large" color="#1B4332" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}