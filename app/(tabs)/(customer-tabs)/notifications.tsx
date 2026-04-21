import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Dummy data for UI testing
const DUMMY_NOTIFICATIONS = [
  {
    id: '1',
    title: 'Order Confirmed! ✅',
    message: 'Your order #NB-882 has been accepted by the farmer.',
    time: '2 mins ago',
    type: 'order',
    unread: true,
  },
  {
    id: '2',
    title: 'New Message 💬',
    message: 'Farmer John sent you a message about the delivery.',
    time: '1 hour ago',
    type: 'message',
    unread: true,
  },
  {
    id: '3',
    title: 'Price Drop 📉',
    message: 'The price for Fresh Carrots just dropped by 10%!',
    time: 'Yesterday',
    type: 'promo',
    unread: false,
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(DUMMY_NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  return (
    <View className="flex-1 bg-[#F0FAF4]">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-4">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm mr-4"
            >
              <Ionicons name="arrow-back" size={20} color="#1B4332" />
            </TouchableOpacity>
            <Text className="text-[#1B4332] text-2xl font-black">Notifications</Text>
          </View>
          
          <TouchableOpacity onPress={markAllRead}>
            <Text className="text-[#40916C] font-bold text-xs">Mark all read</Text>
          </TouchableOpacity>
        </View>

        {/* List */}
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-20">
              <Ionicons name="notifications-off-outline" size={64} color="#D8F3DC" />
              <Text className="text-[#95D5B2] font-bold mt-4">No notifications yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              className={`flex-row p-4 rounded-[24px] mb-4 border ${
                item.unread ? 'bg-white border-[#D8F3DC] shadow-sm' : 'bg-[#F8FDFB] border-transparent'
              }`}
            >
              {/* Icon Based on Type */}
              <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${
                item.type === 'order' ? 'bg-[#D8F3DC]' : item.type === 'message' ? 'bg-blue-50' : 'bg-orange-50'
              }`}>
                <Ionicons 
                  name={item.type === 'order' ? 'cart' : item.type === 'message' ? 'chatbubble' : 'pricetag'} 
                  size={24} 
                  color={item.type === 'order' ? '#1B4332' : item.type === 'message' ? '#3B82F6' : '#F59E0B'} 
                />
              </View>

              <View className="flex-1">
                <View className="flex-row justify-between items-start">
                  <Text className={`text-[15px] ${item.unread ? 'font-black text-[#1B4332]' : 'font-bold text-gray-500'}`}>
                    {item.title}
                  </Text>
                  {item.unread && <View className="w-2 h-2 bg-red-500 rounded-full mt-1" />}
                </View>
                <Text className="text-gray-400 text-xs mt-1 leading-4" numberOfLines={2}>
                  {item.message}
                </Text>
                <Text className="text-[#95D5B2] text-[10px] font-bold mt-2 uppercase tracking-tighter">
                  {item.time}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </View>
  );
}