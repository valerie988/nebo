import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://172.20.10.2:8000";

export default function FarmerInsightsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  const fetchInsights = async () => {
    try {
      const token = await AsyncStorage.getItem("nebo_token");
      const res = await fetch(`${API_URL}/products/my`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setProducts(data);
    } catch (error) {
      console.error("Insights Error", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchInsights(); }, []);

  // Calculate Trend Data
  const stockLevel = useMemo(() => {
    if (products.length === 0) return 0;
    const total = products.reduce((acc, p) => acc + (p.quantity || 0), 0);
    return total;
  }, [products]);

  return (
    <View className="flex-1 bg-[#F8FDF9]">
      <SafeAreaView className="flex-1">
        <ScrollView 
          contentContainerStyle={{ padding: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchInsights} />}
        >
          {/* Header */}
          <View className="mb-8">
            <Text className="text-[#1B4332] text-3xl font-black tracking-tighter">Market Trends</Text>
            <Text className="text-[#52B788] text-xs font-bold">See what is moving in the market</Text>
          </View>

          {/* Performance Chart Placeholder */}
          <View className="bg-white p-6 rounded-[40px] border border-[#D8F3DC] mb-8 shadow-sm">
            <Text className="text-[#1B4332] font-black text-lg mb-4">Views Overview</Text>
            
            {/* Simple Visual Chart using Views */}
            <View className="flex-row items-end justify-between h-32 px-2">
              {[40, 70, 45, 90, 65, 80, 50].map((height, i) => (
                <View key={i} className="items-center">
                  <View 
                    style={{ height: height }} 
                    className={`w-6 rounded-t-lg ${i === 3 ? 'bg-[#1B4332]' : 'bg-[#B7E4C7]'}`} 
                  />
                  <Text className="text-[#95D5B2] text-[8px] mt-2 font-bold">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Market Insights Grid */}
          <View className="flex-row justify-between mb-6">
            <View className="bg-[#E9F7EF] p-5 rounded-[32px] w-[48%]">
              <Ionicons name="flame" size={24} color="#1B4332" />
              <Text className="text-[#1B4332] font-black text-xl mt-2">Corn</Text>
              <Text className="text-[#52B788] text-[10px] font-bold uppercase">Trending Now</Text>
            </View>
            
            <View className="bg-white p-5 rounded-[32px] w-[48%] border border-[#D8F3DC]">
              <Ionicons name="eye" size={24} color="#52B788" />
              <Text className="text-[#1B4332] font-black text-xl mt-2">1,240</Text>
              <Text className="text-[#95D5B2] text-[10px] font-bold uppercase">Profile Visits</Text>
            </View>
          </View>

          {/* Inventory Health Section */}
          <Text className="text-[#1B4332] text-xl font-black mb-4">Inventory Health</Text>
          
          <View className="bg-white rounded-[32px] p-6 border border-[#D8F3DC] mb-6">
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-[#1B4332] font-bold">Total Stock Volume</Text>
                <Text className="text-[#95D5B2] text-xs">{stockLevel} units currently listed</Text>
              </View>
              <View className="bg-[#F0FAF4] p-3 rounded-2xl">
                <Ionicons name="cube" size={20} color="#1B4332" />
              </View>
            </View>

            {/* Stock Progress Bar */}
            <View className="h-2 w-full bg-[#F0FAF4] rounded-full overflow-hidden">
               <View style={{ width: '65%' }} className="h-full bg-[#52B788]" />
            </View>
            <Text className="text-[#52B788] text-[10px] font-bold mt-2">65% of your capacity utilized</Text>
          </View>

          {/* Trending Categories */}
          <Text className="text-[#1B4332] text-xl font-black mb-4">Market Demand</Text>
          {['Vegetables', 'Tubers', 'Poultry'].map((cat, index) => (
            <View key={cat} className="flex-row items-center bg-white p-4 rounded-3xl border border-[#D8F3DC] mb-3">
              <Text className="text-[#1B4332] font-black mr-4">0{index + 1}</Text>
              <Text className="text-[#1B4332] font-bold flex-1">{cat}</Text>
              <View className="bg-[#E9F7EF] px-3 py-1 rounded-full">
                <Text className="text-[#1B4332] text-[10px] font-black">High Demand</Text>
              </View>
            </View>
          ))}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}