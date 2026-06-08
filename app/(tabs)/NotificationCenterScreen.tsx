import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  AppNotification,
  useNotifications,
} from "@/components/context/NotificationsContext";
import { clearBadge } from "@/components/services/notificationService";

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

  // Refresh when screen comes into focus (e.g. after a tap from system tray)
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
      clearBadge(); // clear iOS badge when user opens inbox
    }, []),
  );

  function confirmClearAll() {
    Alert.alert("Clear all notifications?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear All", style: "destructive", onPress: clearAll },
    ]);
  }

  if (isLoading && notifications.length === 0) {
    return (
      <ActivityIndicator style={styles.centered} size="large" color="#4CAF50" />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>
          Notifications
          {unreadCount > 0 && (
            <Text style={styles.badge}> {unreadCount} new</Text>
          )}
        </Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity
              onPress={confirmClearAll}
              style={styles.headerBtn}
            >
              <Text style={[styles.headerBtnText, { color: "#E53935" }]}>
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
            colors={["#16a34a"]}
            tintColor="#16a34a"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No notifications yet</Text>
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

// ── Single notification row ───────────────────────────────────────────────────
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
    <View style={[styles.card, !item.is_read && styles.cardUnread]}>
      {/* Unread indicator dot */}
      {!item.is_read && <View style={styles.unreadDot} />}

      <View style={styles.cardContent}>
        <Text style={[styles.title, !item.is_read && styles.titleBold]}>
          {item.title}
        </Text>
        <Text style={styles.body}>{item.message}</Text>
        <Text style={styles.time}>{timeAgo}</Text>

        <View style={styles.actions}>
          {!item.is_read && (
            <TouchableOpacity onPress={onMarkRead} style={styles.actionBtn}>
              <Text style={styles.markReadText}>Mark as read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────
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

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  centered: { flex: 1, justifyContent: "center" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  header: { fontSize: 18, fontWeight: "700", color: "#222" },
  badge: { fontSize: 14, color: "#4CAF50", fontWeight: "600" },
  headerActions: { flexDirection: "row", gap: 12 },
  headerBtn: { paddingVertical: 4 },
  headerBtnText: { fontSize: 13, color: "#4CAF50", fontWeight: "500" },
  list: { padding: 12, paddingTop: 8 },
  emptyContainer: { alignItems: "center", marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: "#aaa" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardUnread: { borderLeftColor: "#4CAF50" },
  unreadDot: {
    position: "absolute",
    top: 16,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
  },
  cardContent: { paddingRight: 16 },
  title: { fontSize: 14, color: "#444", marginBottom: 4 },
  titleBold: { fontWeight: "700", color: "#222" },
  body: { fontSize: 13, color: "#666", marginBottom: 6, lineHeight: 18 },
  time: { fontSize: 11, color: "#bbb", marginBottom: 8 },
  actions: { flexDirection: "row", gap: 16 },
  actionBtn: { paddingVertical: 2 },
  markReadText: { fontSize: 12, color: "#4CAF50", fontWeight: "600" },
  deleteText: { fontSize: 12, color: "#E53935", fontWeight: "600" },
});
