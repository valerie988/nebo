import { useAuth } from "@/components/context/AuthContext";
import { Feather, Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = Constants.expoConfig?.extra?.API_URL;

export default function CustomerOrdersScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      Alert.alert("Error", "Could not load your orders.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/api/orders/${orderId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              setOrders((prev) => prev.filter((o) => o.id !== orderId));
            } else {
              Alert.alert("Error", "Could not cancel order.");
            }
          } catch (err) {
            Alert.alert("Error", "Network error.");
          }
        },
      },
    ]);
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  if (loading)
    return (
      <ActivityIndicator className="flex-1" size="large" color="#1B4332" />
    );

  return (
    <SafeAreaView className="flex-1 bg-[#F0FAF4]">
      <View className="px-6 pt-4 pb-2 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-white rounded-full items-center justify-center border border-[#D8F3DC]"
        >
          <Ionicons name="arrow-back" size={20} color="#1B4332" />
        </TouchableOpacity>
        <Text className="ml-4 text-2xl font-black text-[#1B4332]">
          My Orders
        </Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchOrders} />
        }
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => {
          const product = item.order_items?.[0]?.product;
          return (
            <View className="bg-white p-4 mb-3 rounded-[24px] border border-[#D8F3DC]">
              <View className="flex-row items-center">
                {/* Product Image */}
                <Image
                  source={{
                    uri:
                      product?.image_url || "https://via.placeholder.com/100",
                  }}
                  className="w-16 h-16 rounded-xl bg-[#F0FAF4]"
                />

                {/* Order Details */}
                <View className="flex-1 ml-3">
                  <Text className="text-[#1B4332] font-black text-sm">
                    {product?.name || "Product"}
                  </Text>
                  <Text className="text-[#52B788] text-[10px] font-bold">
                    {item.farmer?.full_name || "Merchant"}
                  </Text>
                  <Text className="text-[#1B4332] font-black text-sm mt-0.5">
                    {item.total_amount} XAF
                  </Text>
                </View>

                <View className="items-end justify-between h-16">
                  {/* Status Badge */}
                  <View className="bg-[#F0FAF4] px-2 py-1 rounded-full">
                    <Text className="text-[#2D6A4F] text-[9px] font-bold uppercase">
                      {item.status.replace("_", " ")}
                    </Text>
                  </View>

                  {/* Delete Button for Delivered & Cancelled Orders */}
                  {["delivered", "cancelled"].includes(item.status) && (
                    <TouchableOpacity
                      onPress={() => deleteOrder(item.id)}
                      className="flex-row items-center bg-red-50 px-3 py-1.5 rounded-lg"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={14}
                        color="#dc2626"
                      />
                      <Text className="text-red-600 font-bold text-[10px] ml-1">
                        Delete
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <Feather name="shopping-bag" size={48} color="#D8F3DC" />
            <Text className="text-[#95D5B2] mt-4 font-bold">
              No orders found
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
