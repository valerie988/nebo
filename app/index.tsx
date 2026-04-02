import { Redirect } from "expo-router";

export default function Index() {
  // If your file is at app/(onboarding)/1.tsx
  return <Redirect href="/(onboarding)/1" />; 
}