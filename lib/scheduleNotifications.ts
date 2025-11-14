/**
 * Auto-Notification Scheduler
 * 
 * Automatically schedules notifications for upcoming events with points
 * Call this when user logs in or app opens
 */

import { supabase } from '../lib/supabase';
import { scheduleEventReminder } from '../lib/notifications';
import { logger } from '../lib/logger';

export async function scheduleUpcomingEventNotifications(): Promise<void> {
  try {
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

    logger.log(`Scheduled ${scheduled} event reminder notifications`);
  } catch (error) {
    logger.error('Error scheduling event notifications', error);
  }
}
