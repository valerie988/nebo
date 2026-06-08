import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import apiClient from "@/components/services/authService"; 
import { setBadgeCount } from '../services/notificationService';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AppNotification {
  id:         number; 
  user_id:    string;
  title:      string;
  message:    string;
  is_read:    boolean;
  created_at: string;
}

interface NotificationsContextValue {
  notifications:  AppNotification[];
  unreadCount:    number;
  isLoading:      boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount:   () => Promise<void>;
  markRead:       (id: number) => Promise<void>; 
  markAllRead:    () => Promise<void>;
  deleteOne:      (id: number) => Promise<void>; 
  clearAll:       () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────
const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [isLoading,     setIsLoading]     = useState(false);

  // ── Fetch full inbox ───────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      // Resilient routing strategy: attempts root endpoints before nested layouts
      let response;
      try {
        response = await apiClient.get<AppNotification[]>('/notifications');
      } catch (err: any) {
        if (err?.response?.status === 404) {
          response = await apiClient.get<AppNotification[]>('/notifications/');
        } else {
          throw err;
        }
      }

      const data = response.data;
      setNotifications(data);
      
      const count = data.filter((n: AppNotification) => !n.is_read).length;
      setUnreadCount(count);
      await setBadgeCount(count);
    } catch (err) {
      console.error('[NeBo] fetchNotifications error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Fetch only unread count (for tab badge) ────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    try {
      let response;
      try {
        response = await apiClient.get<{ count: number }>('/notifications/unread-count');
      } catch (err: any) {
        if (err?.response?.status === 404) {
          response = await apiClient.get<{ count: number }>('/notifications/unread-count/');
        } else {
          throw err;
        }
      }
      setUnreadCount(response.data.count);
      await setBadgeCount(response.data.count);
    } catch (err) {
      console.error('[NeBo] fetchUnreadCount error:', err);
    }
  }, []);

  // ── Mark one as read ──────────────────────────────────────────────────────
  const markRead = useCallback(async (id: number) => {
    try {
      try {
        await apiClient.patch(`/notifications/${id}/read`);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          await apiClient.patch(`/notifications/${id}/read/`);
        } else {
          throw err;
        }
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('[NeBo] markRead error:', err);
    }
  }, []);

  // ── Mark all as read ───────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    try {
      try {
        await apiClient.patch('/notifications/read-all');
      } catch (err: any) {
        if (err?.response?.status === 404) {
          await apiClient.patch('/notifications/read-all/');
        } else {
          throw err;
        }
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      await setBadgeCount(0);
    } catch (err) {
      console.error('[NeBo] markAllRead error:', err);
    }
  }, []);

  // ── Delete one ────────────────────────────────────────────────────────────
  const deleteOne = useCallback(async (id: number) => {
    try {
      try {
        await apiClient.delete(`/notifications/${id}`);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          await apiClient.delete(`/notifications/${id}/`);
        } else {
          throw err;
        }
      }
      setNotifications((prev) => {
        const removed = prev.find((n) => n.id === id);
        const updated = prev.filter((n) => n.id !== id);
        if (removed && !removed.is_read) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return updated;
      });
    } catch (err) {
      console.error('[NeBo] deleteOne error:', err);
    }
  }, []);

  // ── Clear all ─────────────────────────────────────────────────────────────
  const clearAll = useCallback(async () => {
    try {
      try {
        await apiClient.delete('/notifications');
      } catch (err: any) {
        if (err?.response?.status === 404) {
          await apiClient.delete('/notifications/');
        } else {
          throw err;
        }
      }
      setNotifications([]);
      setUnreadCount(0);
      await setBadgeCount(0);
    } catch (err) {
      console.error('[NeBo] clearAll error:', err);
    }
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        fetchUnreadCount,
        markRead,
        markAllRead,
        deleteOne,
        clearAll,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be inside <NotificationsProvider>');
  return ctx;
}