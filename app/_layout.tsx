import { AuthProvider, useAuth } from "@/components/context/AuthContext";
import { NotificationsProvider } from "@/components/context/NotificationsContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";

configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

// @ts-ignore
import "../global.css";

function RootLayoutNav() {
  const { token, role, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(
    null,
  );

  // ✅ Re-reads AsyncStorage every time the route changes
  useEffect(() => {
    AsyncStorage.getItem("has_seen_onboarding").then((val) => {
      setHasSeenOnboarding(val === "true");
    });
  }, [segments]);

  useEffect(() => {
    if (isLoading || hasSeenOnboarding === null) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(onboarding)";

    if (!token) {
      if (!hasSeenOnboarding && !inOnboarding) {
        router.replace("/(onboarding)/1");
      } else if (hasSeenOnboarding && !inAuthGroup) {
        router.replace("/(auth)/login");
      }
      return;
    }

    // Logged in — send to correct home
    if (inAuthGroup || inOnboarding) {
      router.replace(
        role === "farmer"
          ? "/(tabs)/(farmer-tabs)/home"
          : "/(tabs)/(customer-tabs)/home",
      );
    }
  }, [token, role, isLoading, segments, hasSeenOnboarding]);

  if (isLoading || hasSeenOnboarding === null) {
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
      <NotificationsProvider>
        <RootLayoutNav />
      </NotificationsProvider>
    </AuthProvider>
  );
}
