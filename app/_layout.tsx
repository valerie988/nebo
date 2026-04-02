import "../global.css"; // Ensure the path points to your global.css
import { Stack } from "expo-router";
import { AuthProvider } from "@/components/context/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}