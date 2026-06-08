import {
  AppNotification,
  useNotifications,
} from "@/components/context/NotificationsContext";
import { clearBadge } from "@/components/services/notificationService";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function NotificationCenterScreen() {
  const {
    notifications,
    isLoading,
    fetchNotifications,
    markRead,
    markAllRead,
    deleteOne,
    clearAll,
    unreadCount,
  } = useNotifications();

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
      clearBadge();
    }, [fetchNotifications]),
  );

  function confirmClearAll() {
    Alert.alert("Clear all notifications?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear All", style: "destructive", onPress: clearAll },
    ]);
  }

  if (isLoading && notifications.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header Container */}
      <View className="flex-row justify-between items-end px-5 pt-14 pb-5 bg-white border-b border-slate-100">
        <View>
          <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Notifications
          </Text>
          {unreadCount > 0 && (
            <Text className="text-xs text-slate-500 mt-1 font-medium">
              {unreadCount} unread messages remaining
            </Text>
          )}
        </View>

        <View className="flex-row gap-4">
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} className="py-1">
              <Text className="text-sm text-green-600 font-semibold">
                Mark all read
              </Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={confirmClearAll} className="py-1">
              <Text className="text-sm text-red-600 font-semibold">
                Clear all
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
  data={notifications}
  keyExtractor={(n) => n.id.toString()}
  contentContainerStyle={{ padding: 16 }}
  showsVerticalScrollIndicator={false}
  refreshControl={
    <RefreshControl
      refreshing={isLoading}
      onRefresh={fetchNotifications}
      colors={['#16a34a']}
      tintColor="#16a34a"
    />
  }
        ListEmptyComponent={
          <View className="items-center justify-center mt-36">
            <View className="w-16 h-16 rounded-full bg-green-50 items-center justify-center mb-4">
              <Text className="text-xl font-bold text-green-600">!</Text>
            </View>
            <Text className="text-sm text-slate-400 font-medium">
              Your inbox is completely clear
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <NotificationItem
            item={item}
            onMarkRead={() => markRead(item.id)}
            onDelete={() => deleteOne(item.id)}
          />
        )}
      />
    </View>
  );
}

// ── Tailwind Notification Row Component ─────────────────────────────────────
function NotificationItem({
  item,
  onMarkRead,
  onDelete,
}: {
  item: AppNotification;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const timeAgo = formatTimeAgo(item.created_at);

  return (
    <View className="bg-white rounded-xl mb-3 flex-row overflow-hidden shadow-sm border border-slate-100">
      {/* Left accent bar changes depth depending on status */}
      <View
        className={`w-[5px] h-full ${item.is_read ? "bg-slate-200" : "bg-green-600"}`}
      />

      {/* Text block explicitly forced to contain layout to avoid clipping */}
      <View className="flex-1 p-4">
        <View className="flex-row justify-between items-start mb-1 gap-2">
          <Text
            className={`text-sm flex-1 ${item.is_read ? "text-slate-500 font-medium" : "text-slate-900 font-bold"}`}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.title}
          </Text>
          <Text className="text-xs text-slate-400 font-normal whitespace-nowrap">
            {timeAgo}
          </Text>
        </View>

        <Text className="text-sm text-slate-600 leading-5 mb-3 pr-1">
          {item.message}
        </Text>

        {/* Action Controls Footer */}
        <View className="flex-row gap-5 mt-1">
          {!item.is_read && (
            <TouchableOpacity onPress={onMarkRead} className="py-1 pr-1">
              <Text className="text-xs text-green-600 font-bold tracking-wide">
                Mark as read
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onDelete} className="py-1 pr-1">
            <Text className="text-xs text-red-600 font-semibold tracking-wide">
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
