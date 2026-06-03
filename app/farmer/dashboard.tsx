import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useNavigation } from "@react-navigation/native";

const API_URL = Constants.expoConfig?.extra?.API_URL;
const { width } = Dimensions.get("window");

export default function FarmerInsightsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  const fetchInsights = async () => {
    try {
      const token = (await AsyncStorage.getItem("nebo_token")) || (await AsyncStorage.getItem("token"));
      if (!token) throw new Error("No token found");

      const res = await fetch(`${API_URL}/api/products/my`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      const data = await res.json();
      if (res.ok) setProducts(data);
    } catch (error) {
      console.error("Insights Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  // Aggregated Data Calculations
  const { stockLevel, categoryData } = useMemo(() => {
    const total = products.reduce((acc, p) => acc + (p.quantity || 0), 0);
    const map: { [key: string]: number } = {};
    products.forEach(p => {
      const cat = p.category || "General";
      map[cat] = (map[cat] || 0) + (p.quantity || 0);
    });
    return { 
      stockLevel: total, 
      categoryData: Object.keys(map).map(k => ({ label: k, value: map[k] })) 
    };
  }, [products]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F8FDF9]">
        <ActivityIndicator size="large" color="#52B788" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F8FDF9]">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#1B4332" />
          </TouchableOpacity>
          <Text className="text-[#1B4332] text-xl font-black ml-2">Market Insights</Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchInsights} />}
        >
          {/* Inventory Health */}
          <View className="bg-white rounded-[32px] p-6 border border-[#D8F3DC] mb-8">
            <Text className="text-[#1B4332] font-black text-lg mb-4">Total Inventory</Text>
            <Text className="text-[#52B788] text-4xl font-black">{stockLevel}</Text>
            <Text className="text-[#95D5B2] font-bold">Total units across all categories</Text>
          </View>

          {/* Dynamic Category Graph */}
          <View className="bg-white p-6 rounded-[40px] border border-[#D8F3DC] mb-8">
            <Text className="text-[#1B4332] font-black text-lg mb-6">Stock by Category</Text>
            <View className="flex-row items-end justify-around h-40">
              {categoryData.map((item, i) => (
                <View key={i} className="items-center w-16">
                  <View
                    style={{ height: stockLevel > 0 ? (item.value / stockLevel) * 120 + 20 : 0 }}
                    className="w-10 bg-[#52B788] rounded-t-xl"
                  />
                  <Text className="text-[#1B4332] text-[10px] mt-2 font-black">{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}