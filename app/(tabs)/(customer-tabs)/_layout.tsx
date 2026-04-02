import { Tabs } from "expo-router";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface TabIconProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
}

function TabIcon({ icon, label, active }: TabIconProps) {
  // Logic to switch from outline to solid when active
  const iconName = active ? icon.replace("-outline", "") : icon;

  return (
    <View className="items-center pt-1.5">
      <Ionicons 
        name={iconName as any} 
        size={22} 
        color={active ? "#1B4332" : "#95D5B2"} 
      />
      <Text
        className={`text-[10px] mt-1 ${
          active ? "font-bold text-[#1B4332]" : "font-medium text-[#95D5B2]"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  
  const tabs = [
    { name: "home",        label: "Home",    icon: "home-outline" },
    { name: "marketplace", label: "Market",  icon: "storefront-outline" },
    { name: "orders",      label: "Orders",  icon: "receipt-outline" },
    { name: "chat",        label: "Chat",    icon: "chatbubbles-outline" },
    { name: "profile",     label: "Profile", icon: "person-outline" },
  ];

  return (
    <View
      style={{ paddingBottom: insets.bottom + 6 }}
      className="flex-row bg-white pt-2 border-t border-[#F0FAF4] shadow-lg shadow-black/10 elevation-5"
    >
      {tabs.map((tab, i) => (
        <TouchableOpacity
          key={tab.name}
          onPress={() => navigation.navigate(tab.name)}
          activeOpacity={0.7}
          className="flex-1 items-center"
        >
          <TabIcon 
            icon={tab.icon as any} 
            label={tab.label} 
            active={state.index === i} 
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

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
    </Tabs>
  );
}