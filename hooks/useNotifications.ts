/**
 * Notifications Hook
 * 
 * Manages notification setup, event listeners, and scheduling
 */

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { registerForPushNotifications } from '../lib/notifications';
import { logger } from '../lib/logger';

export function useNotifications() {
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Register for push notifications on mount
    registerForPushNotifications();

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      logger.log('Notification received!', notification);
    });

    // Listen for user tapping on notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // Navigate based on notification type
      if (data.screen) {
        router.push(data.screen as any);
      }

      // If it's an attendance reminder with code, we could pre-fill it
      if (data.type === 'attendance_reminder' && data.eventCode) {
        // You can store this in a global state or pass via params
        logger.log('Attendance code:', data.eventCode);
      }

      logger.log('Notification tapped!', data);
    });

    // Cleanup
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [router]);

  return null;
}
