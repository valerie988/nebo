import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// Import your centralized apiClient instance
import apiClient from "@/components/services/authService"; 

interface StatusConfig {
  label: string;
  colorClass: string; 
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}

// Config file mapping styling parameters for current state
const STATUS_META: Record<string, StatusConfig> = {
  processing: { label: "Processing", colorClass: "bg-amber-500", iconName: "progress-clock" },
  confirmed: { label: "Confirmed", colorClass: "bg-blue-500", iconName: "check-circle-outline" },
  in_transit: { label: "In Transit", colorClass: "bg-purple-500", iconName: "truck-delivery-outline" },
  delivered: { label: "Delivered", colorClass: "bg-emerald-500", iconName: "package-variant-closed-check" },
  cancelled: { label: "Cancelled", colorClass: "bg-red-500", iconName: "close-circle-outline" },
};

// Strict business state rules matching allow-transitions schema
const allowedTransitions: Record<string, string[]> = {
  processing: ["confirmed", "cancelled"],
  confirmed: ["in_transit", "cancelled"],
  in_transit: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export default function FarmerOrdersScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ---------------- FETCH ORDERS ----------------
  const fetchOrders = async () => {
    try {
      const { data } = await apiClient.get("/orders/farmer");
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ---------------- UPDATE STATUS ----------------
  const updateStatus = async (orderId: string, status: string, productName: string) => {
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status });

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
      );

      Alert.alert(
        "Status updated!",
        `Order for "${productName}" is now marked as ${status.replace("_", " ")}.`
      );
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.detail || "Update failed");
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // ---------------- STATS COUNTERS ----------------
  const stats = useMemo(() => {
    return {
      processing: orders.filter((o) => o.status === "processing").length,
      confirmed: orders.filter((o) => o.status === "confirmed").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
    };
  }, [orders]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F0FAF4]">
        <ActivityIndicator size="large" color="#1B4332" />
      </SafeAreaView>
    );
  }
  const deleteOrder = async (
  orderId: string,
  productName: string
) => {
  Alert.alert(
    "Delete Order",
    `Delete "${productName}" permanently?`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiClient.delete(`/orders/${orderId}`);

            setOrders((prev) =>
              prev.filter((o) => o.id !== orderId)
            );

            Alert.alert(
              "Success",
              "Order deleted successfully."
            );
          } catch (err: any) {
            Alert.alert(
              "Error",
              err?.response?.data?.detail ||
                "Could not delete order."
            );
          }
        },
      },
    ]
  );
};

  return (
    <SafeAreaView className="flex-1 bg-[#F0FAF4]">
      {/* HEADER */}
      <View className="px-6 pt-4 flex-row items-center">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="bg-white p-2.5 rounded-full shadow-sm"
        >
          <Ionicons name="arrow-back" size={22} color="#1B4332" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-black text-[#1B4332]">
          Farmer Orders
        </Text>
      </View>

      {/* STATS OVERVIEW CARDS */}
      <View className="px-6 flex-row gap-2 mt-6">
        <View className="flex-1 bg-[#1B4332] p-4 rounded-2xl shadow-sm border border-[#1b4332]/10">
          <Text className="text-white font-black text-xl">{stats.processing}</Text>
          <Text className="text-white/80 text-xs font-medium mt-0.5">Processing</Text>
        </View>

        <View className="flex-1 bg-[#2D6A4F] p-4 rounded-2xl shadow-sm border border-[#2d6a4f]/10">
          <Text className="text-white font-black text-xl">{stats.confirmed}</Text>
          <Text className="text-white/80 text-xs font-medium mt-0.5">Confirmed</Text>
        </View>

        <View className="flex-1 bg-[#52B788] p-4 rounded-2xl shadow-sm border border-[#52b788]/10">
          <Text className="text-white font-black text-xl">{stats.delivered}</Text>
          <Text className="text-white/80 text-xs font-medium mt-0.5">Delivered</Text>
        </View>
      </View>

      {/* ORDERS FEED */}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchOrders} colors={["#1B4332"]} />
        }
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 60,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <MaterialCommunityIcons name="clipboard-text-outline" size={48} color="#2D6A4F" />
            <Text className="text-[#2D6A4F] font-bold mt-4 text-base">No orders received yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const nextActions = allowedTransitions[item.status] || [];
          const currentMeta = STATUS_META[item.status] || { label: item.status, colorClass: "bg-gray-500", iconName: "package-variant" };
          const productName = item.order_items?.[0]?.product?.name || item.items || "Unknown Product";

          return (
            <View className="bg-white p-5 mb-5 rounded-3xl border border-[#D8F3DC] shadow-sm">
              
              {/* CURRENT STATUS BADGE */}
              <View className="flex-row justify-between items-start border-b border-[#F0FAF4] pb-3 mb-3">
                <View>
                  <Text className="text-xs font-bold uppercase tracking-wider text-gray-400">Order Ref</Text>
                  <Text className="text-[#1B4332] font-bold text-sm">#{item.id.substring(0, 8).toUpperCase()}</Text>
                </View>
                <View className={`flex-row items-center px-3 py-1.5 rounded-full ${currentMeta.colorClass}`}>
                  <MaterialCommunityIcons name={currentMeta.iconName as any} size={14} color="white" style={{ marginRight: 4 }} />
                  <Text className="text-white text-xs font-black capitalize">{currentMeta.label}</Text>
                </View>
              </View>

              {/* TRANSACTION METADATA INFO */}
              <View className="space-y-2">
                <View className="flex-row items-center gap-1.5">
                  <MaterialCommunityIcons name="corn" size={18} color="#2D6A4F" />
                  <Text className="text-[#2D6A4F] text-base font-semibold flex-1">
                    {productName}
                  </Text>
                </View>
                
                <View className="flex-row items-center gap-2 pl-0.5">
                  <Ionicons name="person-outline" size={14} color="#6B7280" />
                  <Text className="text-gray-500 text-sm">
                    Customer: <Text className="font-semibold text-gray-700">{item.customer_name || "Regular Customer"}</Text>
                  </Text>
                </View>

                <View className="flex-row items-center gap-2 pl-0.5">
                  <MaterialCommunityIcons name="numeric" size={16} color="#6B7280" />
                  <Text className="text-gray-500 text-sm">
                    Quantity Ordered: <Text className="font-semibold text-gray-700">{item.quantity || 1} units</Text>
                  </Text>
                </View>
              </View>

              {/* TOTAL BILL SEPARATION METRIC */}
              <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-dashed border-gray-100">
                <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider">Payout Amount</Text>
                <Text className="text-[#1B4332] font-black text-xl">
                  {item.total_amount || (item.price * (item.quantity || 1))} XAF
                </Text>
              </View>

              {/* DYNAMIC PIPELINE STATE ACTION CONTROLS */}
              {nextActions.length > 0 && (
                <View className="mt-4 pt-2">
                  <Text className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Advance Logistics Stage:</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {nextActions.map((statusTarget) => {
                      const targetMeta = STATUS_META[statusTarget];
                      const isCancel = statusTarget === "cancelled";

                      return (
                        <TouchableOpacity
                          key={statusTarget}
                          onPress={() => updateStatus(item.id, statusTarget, productName)}
                          className={`flex-1 min-w-[120px] py-3 rounded-2xl items-center justify-center flex-row shadow-sm gap-1.5 ${
                            isCancel ? "bg-red-50 border border-red-200" : "bg-[#1B4332]"
                          }`}
                        >
                          <MaterialCommunityIcons 
                            name={targetMeta?.iconName as any || "arrow-right-circle-outline"} 
                            size={14} 
                            color={isCancel ? "#DC2626" : "white"} 
                          />
                          <Text className={`text-xs font-black capitalize ${isCancel ? "text-red-600" : "text-white"}`}>
                            {targetMeta?.label || statusTarget.replace("_", " ")}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    
                  </View>
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}