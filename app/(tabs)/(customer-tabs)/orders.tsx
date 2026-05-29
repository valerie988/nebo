import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const API_URL = Constants.expoConfig?.extra?.API_URL;

// --- Constants ---
type OrderStatus = "delivered" | "in_transit" | "processing" | "cancelled";

const STATUS_THEME: Record<OrderStatus, { label: string; text: string; bg: string }> = {
  delivered:  { label: "Delivered",  text: "text-green-800", bg: "bg-green-100" },
  in_transit: { label: "In transit", text: "text-amber-800", bg: "bg-amber-100" },
  processing: { label: "Processing", text: "text-blue-800",  bg: "bg-blue-100" },
  cancelled:  { label: "Cancelled",  text: "text-red-800",   bg: "bg-red-100" },
};

const FILTERS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All",        value: "all" },
  { label: "Active",     value: "in_transit" },
  { label: "Processing", value: "processing" },
  { label: "Delivered",  value: "delivered" },
  { label: "Cancelled",  value: "cancelled" },
];

// --- Order Card Component ---
function OrderCard({ order }: { order: any }) {
  const theme = STATUS_THEME[order.status as OrderStatus] || STATUS_THEME.processing;

  return (
    <View className="bg-white rounded-[20px] p-4 mb-2.5 border border-[#F0FAF4]">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="w-11 h-11 rounded-xl bg-[#F0FAF4] items-center justify-center mr-3">
            <Text className="text-2xl">📦</Text>
          </View>
          <View>
            <Text className="text-[#1B4332] font-bold text-sm">{order.id}</Text>
            <Text className="text-[#95D5B2] text-[11px] mt-0.5">{order.date}</Text>
          </View>
        </View>
        <View className={`${theme.bg} rounded-full px-2.5 py-1`}>
          <Text className={`${theme.text} text-[11px] font-bold`}>{theme.label}</Text>
        </View>
      </View>
      <Text className="text-[#52B788] text-xs leading-5" numberOfLines={1}>{order.items}</Text>
      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-[#F0FAF4]">
        <Text className="text-[#B7E4C7] text-xs">From <Text className="text-[#52B788] font-semibold">{order.farmer}</Text></Text>
        <Text className="text-[#1B4332] font-extrabold text-[15px]">
          {Number(order.total).toLocaleString()} <Text className="text-[#95D5B2] font-normal text-[11px]">XAF</Text>
        </Text>
      </View>
    </View>
  );
}

// --- Main Screen ---
export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<any>("all");

  const fetchOrders = async () => {
    try {
      const token = await AsyncStorage.getItem("nebo_token");
      const response = await fetch(`${API_URL}/orders`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = activeFilter === "all" ? orders : orders.filter((o) => o.status === activeFilter);
  const inTransitCount = orders.filter((o) => o.status === "in_transit").length;

  if (loading) {
    return (
      <View className="flex-1 bg-[#F0FAF4] items-center justify-center">
        <ActivityIndicator size="large" color="#1B4332" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F0FAF4]">
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-5 pb-4">
          <Text className="text-[#1B4332] text-[32px] font-black tracking-tighter">My Orders</Text>
        </View>

        <View className="h-10 mb-3.5">
          <FlatList
            data={FILTERS}
            keyExtractor={(item) => item.value}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setActiveFilter(item.value)}
                className={`rounded-full px-[18px] justify-center h-full ${activeFilter === item.value ? "bg-[#1B4332]" : "bg-white"}`}
              >
                <Text className={`text-[13px] font-semibold ${activeFilter === item.value ? "text-white" : "text-[#1B4332]"}`}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ListEmptyComponent={<Text className="text-center mt-10 text-[#52B788]">No orders found.</Text>}
          renderItem={({ item }) => <OrderCard order={item} />}
        />
      </SafeAreaView>
    </View>
  );
}