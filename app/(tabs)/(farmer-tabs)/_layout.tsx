import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function TabIcon({ icon, label, active }: { icon: any; label: string; active: boolean }) {
  const iconName = active ? icon.replace("-outline", "") : icon;
  return (
    <View className="items-center pt-1.5">
      <Ionicons name={iconName} size={22} color={active ? "#1B4332" : "#95D5B2"} />
      <Text className={`text-[10px] mt-1 ${active ? "font-bold text-[#1B4332]" : "font-medium text-[#95D5B2]"}`}>
        {label}
      </Text>
    </View>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingBottom: insets.bottom + 6 }}
      className="flex-row bg-white pt-2 border-t border-[#F0FAF4] shadow-lg shadow-black/10 elevation-10"
    >
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        
        // Define tabs configuration
        const tabConfig: Record<string, any> = {
          home:        { label: "Home",    icon: "home-outline",        plus: false },
          marketplace: { label: "Market",  icon: "storefront-outline",  plus: false },
          addProduct:  { label: "",        icon: "add",                 plus: true  },
          chat:        { label: "Chat",    icon: "chatbubbles-outline", plus: false },
          "chat/index": { label: "Chat",   icon: "chatbubbles-outline" },
          profile:     { label: "Profile", icon: "person-outline",      plus: false },
        };

        const tab = tabConfig[route.name];
        if (!tab) return null;

        const onPress = () => {
          navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.8}
            className="flex-1 items-center"
          >
            {tab.plus ? (
              <View className="w-14 h-14 rounded-full bg-[#1B4332] items-center justify-center -mt-6 border-[4px] border-white shadow-xl shadow-[#1B4332]/40 elevation-8">
                <Ionicons name="add" size={32} color="white" />
              </View>
            ) : (
              <TabIcon icon={tab.icon} label={tab.label} active={isFocused} />
            )}
          </TouchableOpacity>
        );
      })}
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
      
      {/* Hide child routes */}
      <Tabs.Screen name="chat/[id]" options={{ href: null }} />
    </Tabs>
  );
}