/**
 * Web Notifications Implementation
 * 
 * Provides browser-based notification support as an alternative to 
 * expo-notifications for web platform.
 */

import { logger } from './logger';
import { supabase } from './supabase';

/**
 * Register for web push notifications
 * Note: Web notifications have limited functionality compared to native
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return null;
    }

    // Check existing permissions
    let permission = Notification.permission;

    // Request permissions if not granted
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      logger.warn('Push notification permissions not granted');
      return null;
    }

    // For web, we'll use a simple token (browser identification)
    const token = `web_${navigator.userAgent}_${Date.now()}`;
    
    logger.log('Web Push Token:', token);

    // Save token to user's profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('users')
        .update({ 
          push_token: token,
          push_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        logger.error('Failed to save push token', error);
      }
    }

    return token;
  } catch (error) {
    logger.error('Error registering for push notifications', error);
    return null;
  }
}

/**
 * Schedule a notification (web version - uses browser notifications)
 */
export async function scheduleNotificationAsync(options: {
  content: {
    title: string;
    body: string;
    data?: any;
  };
  trigger: any;
}): Promise<string> {
  try {
    const { content, trigger } = options;
    
    // For web, we'll show immediate notifications
    // (scheduled notifications require service workers which is more complex)
    if (Notification.permission === 'granted') {
      const notification = new Notification(content.title, {
        body: content.body,
        icon: '/favicon.png',
        badge: '/favicon.png',
        data: content.data,
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      return `web_notification_${Date.now()}`;
    }

    return '';
  } catch (error) {
    logger.error('Error scheduling notification', error);
    return '';
  }
}

/**
 * Cancel a notification
 */
export async function cancelScheduledNotificationAsync(notificationId: string): Promise<void> {
  // Web notifications auto-close, nothing to cancel
  console.log('Cancel notification:', notificationId);
}

/**
 * Cancel all notifications
 */
export async function cancelAllScheduledNotificationsAsync(): Promise<void> {
  // Web notifications auto-close, nothing to cancel
  console.log('Cancel all notifications');
}

/**
 * Get notification permissions
 */
export async function getPermissionsAsync(): Promise<{ status: string }> {
  if (!('Notification' in window)) {
    return { status: 'denied' };
  }
  return { status: Notification.permission };
}

/**
 * Request notification permissions
 */
export async function requestPermissionsAsync(): Promise<{ status: string }> {
  if (!('Notification' in window)) {
    return { status: 'denied' };
  }
  const permission = await Notification.requestPermission();
  return { status: permission };
}

// Notification handler (no-op for web)
export function setNotificationHandler(handler: any): void {
  console.log('Notification handler set (web)');
}

// Export stubs for other notification functions used in the app
export async function scheduleEventReminder(
  eventId: string,
  eventTitle: string,
  eventStartTime: string
): Promise<string | null> {
  console.log('Schedule event reminder:', eventTitle);
  return null;
}

export async function scheduleAttendanceReminder(
  eventId: string,
  eventTitle: string,
  eventStartTime: string,
  eventCode: string
): Promise<string | null> {
  console.log('Schedule attendance reminder:', eventTitle);
  return null;
}

export async function cancelAllNotifications(): Promise<void> {
  console.log('Cancel all notifications');
}

export async function scheduleTestNotification(): Promise<void> {
  if (Notification.permission === 'granted') {
    new Notification('Test Notification', {
      body: 'This is a test notification from DSP App',
      icon: '/favicon.png',
    });
  }
}
