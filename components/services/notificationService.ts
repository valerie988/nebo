// src/services/notificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
// Import the default apiClient instead of authService
import apiClient from './authService'; 

// ── Always show alert + sound even when app is open (foreground) ─────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true, // ← Added to satisfy newer expo-notifications versions
    shouldShowList: true,   // ← Added to satisfy newer expo-notifications versions
  }),
});

export async function registerPushToken(): Promise<string | null> {
  // Push tokens only work on real devices
  if (!Device.isDevice) {
    console.warn('[NeBo] Push tokens require a physical device (not Expo Go simulator).');
    return null;
  }

  // ── Android: create notification channel (required for Android 8+) ─────────
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'NeBo Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[NeBo] Push notification permission denied.');
    return null;
  }

  // ── Get Expo push token ───────────────────────────────────────────────────
  // projectId comes from your EAS project — find it in app.json or eas.json
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'YOUR_EAS_PROJECT_ID', // ← Replace with your actual EAS project ID
  });

  const token = tokenData.data;
  console.log('[NeBo] Push token:', token);

  // ── Save token to backend ─────────────────────────────────────────────────
  try {
    // Swapped authService.post to apiClient.post
    await apiClient.post('/users/push-token', { token });
  } catch (err) {
    console.error('[NeBo] Failed to save push token to backend:', err);
  }

  return token;
}

export function setupNotificationListeners(
  onForegroundNotification: (notification: Notifications.Notification) => void,
  onNotificationTap: (response: Notifications.NotificationResponse) => void,
): () => void {
  // Fires when a notification arrives while the app is OPEN
  const foregroundSub = Notifications.addNotificationReceivedListener(
    onForegroundNotification,
  );

  // Fires when user TAPS a notification (foreground, background, or killed)
  const responseSub = Notifications.addNotificationResponseReceivedListener(
    onNotificationTap,
  );

  // Return cleanup for useEffect
  return () => {
    foregroundSub.remove();
    responseSub.remove();
  };
}
export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0);
}