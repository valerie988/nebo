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
  // Logic to show solid icon when active, outline when not
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
    { name: "home",        label: "Home",    icon: "home-outline",        plus: false },
    { name: "marketplace", label: "Market",  icon: "storefront-outline",  plus: false },
    { name: "addProduct",  label: "",        icon: "add",                 plus: true  }, 
    { name: "chat",        label: "Chat",    icon: "chatbubbles-outline", plus: false },
    { name: "profile",     label: "Profile", icon: "person-outline",      plus: false },
  ];
  return (
    <View
      style={{ paddingBottom: insets.bottom + 6 }}
      className="flex-row bg-white pt-2 border-t border-[#F0FAF4] shadow-lg shadow-black/10 elevation-10"
    >
      {tabs.map((tab, i) => (
        <TouchableOpacity
          key={tab.name}
          onPress={() => navigation.navigate(tab.name)}
          activeOpacity={0.8}
          className="flex-1 items-center"
        >
          {tab.plus ? (
            /* --- Big green plus button --- */
            <View 
              className="w-14 h-14 rounded-full bg-[#1B4332] items-center justify-center -mt-6 border-[4px] border-white shadow-xl shadow-[#1B4332]/40 elevation-8"
            >
              <Ionicons name="add" size={32} color="white" />
            </View>
          ) : (
            <TabIcon
              icon={tab.icon as any}
              label={tab.label}
              active={state.index === i}
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function FarmerTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="marketplace" />
      <Tabs.Screen name="addProduct" /> 
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}