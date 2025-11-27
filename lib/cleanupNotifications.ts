/**
 * Notification Cleanup Utility
 * 
 * Use this to clean up duplicate notifications if they already exist
 * Call once on app start or from settings
 */

import * as Notifications from 'expo-notifications';
import { logger } from './logger';

/**
 * Remove all duplicate event notifications
 * Keeps only one notification per event
 */
export async function cleanupDuplicateNotifications(): Promise<void> {
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    // Group notifications by event ID
    const notificationsByEvent = new Map<string, string[]>();
    
    for (const notification of allNotifications) {
      const eventId = notification.content?.data?.eventId as string | undefined;
      const type = notification.content?.data?.type as string | undefined;
      
      // Only process event reminder notifications
      if (type === 'event_reminder' && eventId) {
        if (!notificationsByEvent.has(eventId)) {
          notificationsByEvent.set(eventId, []);
        }
        notificationsByEvent.get(eventId)!.push(notification.identifier);
      }
    }
    
    // For each event with multiple notifications, keep only the first one
    let removedCount = 0;
    for (const [eventId, notificationIds] of notificationsByEvent) {
      if (notificationIds.length > 1) {
        // Keep the first, remove the rest
        for (let i = 1; i < notificationIds.length; i++) {
          await Notifications.cancelScheduledNotificationAsync(notificationIds[i]);
          removedCount++;
        }
        logger.log(`Cleaned up ${notificationIds.length - 1} duplicate notifications for event ${eventId}`);
      }
    }
    
    logger.log(`Total duplicate notifications removed: ${removedCount}`);
    
  } catch (error) {
    logger.error('Error cleaning up duplicate notifications', error);
  }
}

/**
 * Get a summary of all scheduled notifications for debugging
 */
export async function getNotificationSummary(): Promise<{
  total: number;
  byEvent: Map<string, number>;
  duplicates: string[];
}> {
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const byEvent = new Map<string, number>();
    const duplicates: string[] = [];
    
    for (const notification of allNotifications) {
      const eventId = notification.content?.data?.eventId as string | undefined;
      if (eventId) {
        const count = (byEvent.get(eventId) || 0) + 1;
        byEvent.set(eventId, count);
        
        if (count > 1) {
          duplicates.push(eventId);
        }
      }
    }
    
    return {
      total: allNotifications.length,
      byEvent,
      duplicates: [...new Set(duplicates)], // Unique event IDs with duplicates
    };
  } catch (error) {
    logger.error('Error getting notification summary', error);
    return { total: 0, byEvent: new Map(), duplicates: [] };
  }
}
