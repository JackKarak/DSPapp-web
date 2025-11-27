/**
 * Auto-Notification Scheduler
 * 
 * Automatically schedules notifications for upcoming events with points
 * Call this when user logs in or app opens
 */

import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { scheduleEventReminder } from '../lib/notifications';
import { logger } from '../lib/logger';

// Track last scheduled time to prevent duplicate scheduling
let lastScheduledTime = 0;
const SCHEDULE_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown

export async function scheduleUpcomingEventNotifications(): Promise<void> {
  try {
    // Prevent duplicate scheduling within cooldown period
    const now = Date.now();
    if (now - lastScheduledTime < SCHEDULE_COOLDOWN) {
      logger.log('Skipping notification scheduling (within cooldown period)');
      return;
    }

    // Cancel all existing event reminder notifications to prevent duplicates
    const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of existingNotifications) {
      // Only cancel event reminder notifications (not other types)
      if (notification.content?.data?.type === 'event_reminder') {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
    logger.log(`Canceled ${existingNotifications.filter(n => n.content?.data?.type === 'event_reminder').length} existing event notifications`);

    // Get events happening in the next 7 days that award points
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, start_time, point_value, point_type')
      .eq('status', 'approved')
      .eq('is_non_event', false)
      .gt('point_value', 0) // Only events with points
      .gte('start_time', new Date().toISOString())
      .lte('start_time', sevenDaysFromNow.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      logger.error('Failed to fetch events for notifications', error);
      return;
    }

    if (!events || events.length === 0) {
      logger.log('No upcoming events with points to schedule notifications for');
      lastScheduledTime = now; // Update timestamp even if no events
      return;
    }

    // Schedule notifications for each event
    let scheduled = 0;
    for (const event of events) {
      const notificationId = await scheduleEventReminder(
        event.id,
        event.title,
        event.start_time,
        event.point_value,
        event.point_type
      );

      if (notificationId) {
        scheduled++;
      }
    }

    lastScheduledTime = now; // Update timestamp after successful scheduling
    logger.log(`Scheduled ${scheduled} event reminder notifications`);
  } catch (error) {
    logger.error('Error scheduling event notifications', error);
  }
}
