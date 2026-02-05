/**
 * useEventAnalytics Hook
 * Calculates analytics for each event
 */

import { useMemo } from 'react';
import type { Member, Event, Attendance, EventAnalytics } from '../../types/analytics';
import { createMemberLookup, getActiveBrothers } from './analyticsUtils';

export function useEventAnalytics(
  events: Event[],
  attendance: Attendance[],
  members: Member[]
): EventAnalytics[] {
  return useMemo(() => {
    const memberLookup = createMemberLookup(members);
    
    // Only count brothers for attendance rate calculations
    const brothers = getActiveBrothers(members);
    const totalBrothers = brothers.length;
    
    return events.map((event) => {
      const eventAttendance = attendance.filter((a) => a.event_id === event.id);
      
      // Deduplicate attendance records for this event
      const uniqueAttendance = new Map<string, Attendance>();
      eventAttendance.forEach(att => {
        // Keep the first attendance record for each user
        if (!uniqueAttendance.has(att.user_id)) {
          uniqueAttendance.set(att.user_id, att);
        }
      });
      
      const uniqueAttendanceArray = Array.from(uniqueAttendance.values());
      // All records in event_attendance represent actual attendance (attended_at is set)
      const attended = uniqueAttendanceArray;
      const rsvped = uniqueAttendanceArray.filter((a) => a.rsvp);
      
      const attendanceCount = attended.length;
      // Calculate attendance rate based on total brothers (not all members)
      const attendanceRate = totalBrothers > 0 ? (attendanceCount / totalBrothers) * 100 : 0;
      const rsvpCount = rsvped.length;
      const noShowRate = rsvpCount > 0 ? ((rsvpCount - attendanceCount) / rsvpCount) * 100 : 0;

      // Get top 5 attendees by points
      const topAttendees = attended
        .slice(0, 5)
        .map((a) => {
          const member = memberLookup.get(a.user_id);
          return member ? `${member.first_name} ${member.last_name}` : 'Unknown';
        });

      const creator = memberLookup.get(event.creator_id);
      const creatorName = creator ? `${creator.first_name} ${creator.last_name}` : 'Unknown';

      return {
        id: event.id,
        title: event.title,
        date: event.start_time,
        startTime: event.start_time,
        endTime: event.end_time,
        attendanceCount,
        attendanceRate,
        pointValue: event.point_value,
        pointType: event.point_type,
        rsvpCount,
        noShowRate,
        topAttendees,
        creator: creatorName,
      };
    });
  }, [events, attendance, members]);
}
