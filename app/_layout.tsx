import { AuthProvider, useAuth } from "@/components/context/AuthContext";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

// @ts-ignore
import "../global.css";

function RootLayoutNav() {
  const { token, role, isLoading } = useAuth();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    // 1. Wait for AuthContext to finish loading from AsyncStorage
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isAtRoot = segments.length === 0;

    // 2. Scenario: Not logged in
    // Only redirect if we are NOT already in the auth group
    if (!token && !inAuthGroup) {
      router.replace("/(auth)/login");
    }
    // 3. Scenario: Logged in
    // Only redirect if we are at the app root (e.g., initial launch)
    // We do NOT redirect if we are inside a tab or a sub-page
    else if (token && isAtRoot) {
      const homePath =
        role === "farmer"
          ? "/(tabs)/(farmer-tabs)/home"
          : "/(tabs)/(customer-tabs)/home";
      router.replace(homePath as any);
    }
  }, [token, role, isLoading, segments]);

  // Loading state
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
