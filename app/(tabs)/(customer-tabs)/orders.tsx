import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

type OrderStatus = "delivered" | "in_transit" | "processing" | "cancelled";

const ORDERS: {
  id: string;
  items: string;
  farmer: string;
  total: number;
  date: string;
  status: OrderStatus;
  emoji: string;
}[] = [
  { id: "ORD-001", items: "Tomatoes × 2kg, Spinach × 1 bunch",      farmer: "Nkomo Farm",     total: 1250, date: "Today, 10:32 AM",    status: "in_transit", emoji: "🍅" },
  { id: "ORD-002", items: "Sweet Plantains × 3 bunches",             farmer: "Green Valley",   total: 900,  date: "Yesterday, 3:15 PM", status: "delivered",  emoji: "🍌" },
  { id: "ORD-003", items: "Organic Carrots × 1kg, Ginger × 500g",   farmer: "Biya Roots",     total: 700,  date: "Mar 22, 11:00 AM",  status: "delivered",  emoji: "🥕" },
  { id: "ORD-004", items: "Corn Cobs × 6, Groundnuts × 500g",       farmer: "Savanna Fields", total: 1250, date: "Mar 20, 9:45 AM",   status: "cancelled",  emoji: "🌽" },
  { id: "ORD-005", items: "Ripe Avocados × 4 pieces",               farmer: "Green Valley",   total: 800,  date: "Mar 18, 2:00 PM",   status: "delivered",  emoji: "🥑" },
  { id: "ORD-006", items: "Garlic × 1kg, Fresh Herbs bundle",       farmer: "Ngozi Herbs",    total: 950,  date: "Mar 15, 8:30 AM",   status: "processing", emoji: "🧄" },
];

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

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order }: { order: (typeof ORDERS)[0] }) {
  const theme = STATUS_THEME[order.status];

  return (
    <View className="bg-white rounded-[20px] p-4 mb-2.5">
      {/* Top Section */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="w-11 h-11 rounded-xl bg-[#F0FAF4] items-center justify-center mr-3">
            <Text className="text-2xl">{order.emoji}</Text>
          </View>
          <View>
            <Text className="text-[#1B4332] font-bold text-sm">{order.id}</Text>
            <Text className="text-[#95D5B2] text-[11px] mt-0.5">{order.date}</Text>
          </View>
        </View>

        {/* Status Pill */}
        <View className={`${theme.bg} rounded-full px-2.5 py-1`}>
          <Text className={`${theme.text} text-[11px] font-bold`}>{theme.label}</Text>
        </View>
      </View>

      {/* Items Summary */}
      <Text className="text-[#52B788] text-xs leading-5" numberOfLines={1}>
        {order.items}
      </Text>

      {/* Bottom Divider & Price */}
      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-[#F0FAF4]">
        <Text className="text-[#B7E4C7] text-xs">
          From <Text className="text-[#52B788] font-semibold">{order.farmer}</Text>
        </Text>
        <Text className="text-[#1B4332] font-extrabold text-[15px]">
          {order.total.toLocaleString()} <Text className="text-[#95D5B2] font-normal text-[11px]">XAF</Text>
        </Text>
      </View>

      {/* Reorder Button */}
      {order.status === "delivered" && (
        <TouchableOpacity
          activeOpacity={0.8}
          className="mt-2.5 rounded-xl py-2.5 items-center bg-[#F0FAF4]"
        >
          <Text className="text-[#1B4332] text-[13px] font-bold">Reorder →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Orders Screen ────────────────────────────────────────────────────────────
export default function OrdersScreen() {
  const [activeFilter, setActiveFilter] = useState<OrderStatus | "all">("all");

  const filtered = activeFilter === "all" 
    ? ORDERS 
    : ORDERS.filter((o) => o.status === activeFilter);

  const inTransitCount = ORDERS.filter((o) => o.status === "in_transit").length;

  return (
    <View className="flex-1 bg-[#F0FAF4]">
      <SafeAreaView className="flex-1">

        {/* Header */}
        <View className="px-5 pt-5 pb-4">
          <Text className="text-[#1B4332] text-[32px] font-black tracking-tighter">
            My Orders
          </Text>
          <Text className="text-[#52B788] text-[13px] font-medium mt-0.5">
            {ORDERS.length} total · {inTransitCount} on the way
          </Text>
        </View>

        {/* Active Order Banner */}
        {inTransitCount > 0 && (
          <View className="mx-5 mb-4 bg-[#1B4332] rounded-[20px] px-[18px] py-3.5 flex-row items-center justify-between">
            <View>
              <Text className="text-[#95D5B2] text-[11px] font-bold uppercase tracking-widest">
                On the way
              </Text>
              <Text className="text-white font-bold text-sm mt-0.5">
                {inTransitCount} order{inTransitCount > 1 ? "s" : ""} in transit
              </Text>
            </View>
            <Text className="text-3xl">🚚</Text>
          </View>
        )}

        {/* Filters List */}
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
                activeOpacity={0.8}
                className={`rounded-full px-[18px] justify-center h-full ${
                  activeFilter === item.value ? "bg-[#1B4332]" : "bg-white"
                }`}
              >
                <Text
                  className={`text-[13px] font-semibold ${
                    activeFilter === item.value ? "text-white" : "text-[#1B4332]"
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Main Orders List */}
        {filtered.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-5xl mb-3">📋</Text>
            <Text className="text-[#1B4332] font-bold text-base">No orders here</Text>
            <Text className="text-[#95D5B2] text-[13px] mt-1">Try a different filter</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => <OrderCard order={item} />}
          />
        )}

      </SafeAreaView>
    </View>
  );
}