import { useAuth } from "@/components/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
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

const API_URL = Constants.expoConfig?.extra?.API_URL;

// ✅ Order status flow (safe transitions)
const allowedTransitions: Record<string, string[]> = {
  processing: ["confirmed", "cancelled"],
  confirmed: ["in_transit", "cancelled"],
  in_transit: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export default function FarmerOrdersScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ---------------- FETCH ORDERS ----------------
  const fetchOrders = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/orders/farmer`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ---------------- UPDATE STATUS ----------------
  const updateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
        );
      } else {
        Alert.alert("Error", data?.detail || "Update failed");
      }
    } catch (err) {
      Alert.alert("Error", "Network error");
    }
  };

  // ---------------- INIT ----------------
  useEffect(() => {
    fetchOrders();
  }, [token]);

  // ---------------- STATS ----------------
  const stats = useMemo(() => {
    return {
      processing: orders.filter((o) => o.status === "processing").length,
      confirmed: orders.filter((o) => o.status === "confirmed").length,
      in_transit: orders.filter((o) => o.status === "in_transit").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
    };
  }, [orders]);

  // ---------------- LOADING ----------------
  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#1B4332" />
      </SafeAreaView>
    );
  }

  // ---------------- UI ----------------
  return (
    <SafeAreaView className="flex-1 bg-[#F0FAF4]">
      {/* HEADER */}
      <View className="px-6 pt-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1B4332" />
        </TouchableOpacity>

        <Text className="ml-4 text-2xl font-black text-[#1B4332]">
          Farmer Orders
        </Text>
      </View>

      {/* STATS */}
      <View className="px-6 flex-row gap-2 mt-4">
        <View className="flex-1 bg-[#1B4332] p-4 rounded-2xl">
          <Text className="text-white font-bold">{stats.processing}</Text>
          <Text className="text-white text-xs">Processing</Text>
        </View>

        <View className="flex-1 bg-[#2D6A4F] p-4 rounded-2xl">
          <Text className="text-white font-bold">{stats.confirmed}</Text>
          <Text className="text-white text-xs">Confirmed</Text>
        </View>

        <View className="flex-1 bg-[#52B788] p-4 rounded-2xl">
          <Text className="text-white font-bold">{stats.delivered}</Text>
          <Text className="text-white text-xs">Delivered</Text>
        </View>
      </View>

      {/* LIST */}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchOrders} />
        }
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 40,
        }}
        renderItem={({ item }) => {
          const actions = allowedTransitions[item.status] || [];

          return (
            <View className="bg-white p-5 mb-4 rounded-2xl border border-[#D8F3DC]">
           
              {/* CUSTOMER NAME */}
              <Text className="text-[#2D6A4F] mt-1">
                Customer: {item.customer_name || "Unknown"}
              </Text>

              <Text className="text-[#2D6A4F] mt-1">
                Product:{" "}
                {item.order_items?.[0]?.product?.name || "Unknown Product"}
              </Text>

              {/* AMOUNT */}
              <Text className="text-lg font-black mt-2">
                {item.total_amount} XAF
              </Text>

              {/* STATUS */}
              <Text className="text-xs mt-1 text-gray-500 capitalize">
                Status: {item.status.replace("_", " ")}
              </Text>

              {/* ACTION BUTTONS */}
              {actions.length > 0 && (
                <View className="flex-row flex-wrap gap-2 mt-4">
                  {actions.map((status) => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => updateStatus(item.id, status)}
                      className={`px-3 py-2 rounded-xl ${
                        status === "cancelled" ? "bg-red-500" : "bg-[#1B4332]"
                      }`}
                    >
                      <Text className="text-white text-xs font-bold capitalize">
                        {status.replace("_", " ")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
