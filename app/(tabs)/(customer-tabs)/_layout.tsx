import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// 1. Icon Component (remains the same)
function TabIcon({ icon, label, active }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean }) {
  const iconName = active ? icon.replace("-outline", "") : icon;
  return (
    <View className="items-center pt-1.5">
      <Ionicons name={iconName as any} size={22} color={active ? "#1B4332" : "#95D5B2"} />
      <Text className={`text-[10px] mt-1 ${active ? "font-bold text-[#1B4332]" : "font-medium text-[#95D5B2]"}`}>
        {label}
      </Text>
    </View>
  );
}

// 2. Custom Tab Bar Component
function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();

  // THIS MUST MATCH YOUR Tabs.Screen names exactly
  const tabData: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
    home:        { label: "Home",    icon: "home-outline" },
    marketplace: { label: "Market",  icon: "storefront-outline" },
    orders:      { label: "Orders",  icon: "receipt-outline" },
    chat:        { label: "Chat",    icon: "chatbubbles-outline" },
    "chat/index": { label: "Chat",   icon: "chatbubbles-outline" },
    profile:     { label: "Profile", icon: "person-outline" },
  };

  return (
    <View
      style={{ paddingBottom: insets.bottom + 6 }}
      className="flex-row bg-white pt-2 border-t border-[#F0FAF4] shadow-lg"
    >
      {state.routes.map((route: any, index: number) => {
        // Look up the tab info
        const currentTab = tabData[route.name];
        
        // If route name is not in our whitelist, don't show it (e.g., chat/[id])
        if (!currentTab) return null;

        const isFocused = state.index === index;

        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            className="flex-1 items-center"
          >
            <TabIcon
              icon={currentTab.icon}
              label={currentTab.label}
              active={isFocused}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// 3. Main Layout
export default function CustomerTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="marketplace" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="profile" />

      {/* Hide these from the tab bar */}
      <Tabs.Screen name="chat/[id]" options={{ href: null }} />
      <Tabs.Screen name="product/[id]" options={{ href: null }} />
    </Tabs>
  );
}