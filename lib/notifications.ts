/**
 * Push Notification Service
 * 
 * Handles registration, scheduling, and sending push notifications
 * Uses Expo's FREE push notification service
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { logger } from './logger';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register device for push notifications and save token to database
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check if running on physical device
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.warn('Push notification permissions not granted');
      return null;
    }

    // Get Expo Push Token (FREE - no configuration needed!)
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '9f6f58a7-3407-4218-8b49-61530c10345f', // Your EAS project ID
    });

    logger.log('Expo Push Token:', token.data);

    // Save token to user's profile in database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('users')
        .update({ 
          push_token: token.data,
          push_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        logger.error('Failed to save push token', error);
      }
    }

    // Android-specific channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Event Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F7B910', // DSP Gold
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('attendance', {
        name: 'Attendance Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#330066', // DSP Purple
        sound: 'default',
      });
    }

    return token.data;
  } catch (error) {
    logger.error('Error registering for push notifications', error);
    return null;
  }
}

/**
 * Schedule a local notification for an upcoming event
 */
export async function scheduleEventReminder(
  eventId: string,
  eventTitle: string,
  eventStartTime: string,
  pointValue: number,
  pointType: string
): Promise<string | null> {
  try {
    const startTime = new Date(eventStartTime);
    const now = new Date();

    // Schedule 30 minutes before event
    const reminderTime = new Date(startTime.getTime() - 30 * 60 * 1000);

    // Don't schedule if event already started or reminder time passed
    if (reminderTime < now) {
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `📅 Event Starting Soon!`,
        body: `${eventTitle} starts in 30 minutes • ${pointValue} ${pointType} points`,
        data: { 
          eventId, 
          type: 'event_reminder',
          screen: '/(tabs)' // Navigate to calendar
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: 'EVENT_REMINDER',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime,
      } as Notifications.DateTriggerInput,
    });

    logger.log(`Scheduled reminder for event ${eventId} at ${reminderTime}`);
    return notificationId;
  } catch (error) {
    logger.error('Error scheduling event reminder', error);
    return null;
  }
}

/**
 * Schedule attendance reminder (5 minutes before event)
 */
export async function scheduleAttendanceReminder(
  eventId: string,
  eventTitle: string,
  eventStartTime: string,
  eventCode: string
): Promise<string | null> {
  try {
    const startTime = new Date(eventStartTime);
    const now = new Date();

    // Schedule 5 minutes before event (when attendance opens)
    const reminderTime = new Date(startTime.getTime() - 5 * 60 * 1000);

    if (reminderTime < now) {
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `✅ Check In Now!`,
        body: `${eventTitle} check-in is open. Tap to submit attendance.`,
        data: { 
          eventId,
          eventCode,
          type: 'attendance_reminder',
          screen: '/(tabs)/attendance'
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'ATTENDANCE',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime,
      } as Notifications.DateTriggerInput,
    });

    logger.log(`Scheduled attendance reminder for event ${eventId} at ${reminderTime}`);
    return notificationId;
  } catch (error) {
    logger.error('Error scheduling attendance reminder', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    logger.error('Error canceling notification', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    logger.error('Error canceling all notifications', error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    logger.error('Error getting scheduled notifications', error);
    return [];
  }
}

/**
 * Send immediate notification (for testing or urgent alerts)
 */
export async function sendImmediateNotification(
  title: string,
  body: string,
  data?: any
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: null, // Send immediately
  });
}
