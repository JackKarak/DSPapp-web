/**
 * Debug Notification Utility
 * 
 * Use this in development to diagnose notification issues
 * Call from console or add a debug button in settings
 */

import * as Notifications from 'expo-notifications';
import { getNotificationSummary } from './cleanupNotifications';
import { logger } from './logger';

/**
 * Print detailed info about all scheduled notifications
 */
export async function debugNotifications(): Promise<void> {
  console.log('🔔 === NOTIFICATION DEBUG INFO ===');
  
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const summary = await getNotificationSummary();
    
    console.log(`\n📊 Summary:`);
    console.log(`  Total scheduled: ${summary.total}`);
    console.log(`  Unique events: ${summary.byEvent.size}`);
    console.log(`  Events with duplicates: ${summary.duplicates.length}`);
    
    if (summary.duplicates.length > 0) {
      console.log(`\n⚠️  Duplicate notifications found for events:`);
      summary.duplicates.forEach(eventId => {
        const count = summary.byEvent.get(eventId);
        console.log(`    Event ${eventId}: ${count} notifications`);
      });
    }
    
    console.log(`\n📋 All scheduled notifications:`);
    allNotifications.forEach((notif, index) => {
      const eventId = notif.content?.data?.eventId;
      const type = notif.content?.data?.type;
      const title = notif.content?.title;
      const trigger = notif.trigger as any;
      const triggerDate = trigger && 'date' in trigger ? new Date(trigger.date * 1000) : 'unknown';
      
      console.log(`  ${index + 1}. ${title}`);
      console.log(`     ID: ${notif.identifier}`);
      console.log(`     Event ID: ${eventId}`);
      console.log(`     Type: ${type}`);
      console.log(`     Scheduled for: ${triggerDate}`);
      console.log('');
    });
    
    console.log('🔔 === END DEBUG INFO ===\n');
    
  } catch (error) {
    console.error('❌ Error debugging notifications:', error);
  }
}

/**
 * Clear all notifications (for testing)
 */
export async function clearAllNotifications(): Promise<void> {
  try {
    const count = (await Notifications.getAllScheduledNotificationsAsync()).length;
    await Notifications.cancelAllScheduledNotificationsAsync();
    logger.log(`Cleared ${count} scheduled notifications`);
    console.log(`✅ Cleared ${count} scheduled notifications`);
  } catch (error) {
    console.error('❌ Error clearing notifications:', error);
  }
}
