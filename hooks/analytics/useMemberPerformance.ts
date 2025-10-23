/**
 * useMemberPerformance Hook
 * Calculates member performance rankings
 */

import { useMemo } from 'react';
import type { Member, Event, Attendance, MemberPerformance } from '../../types/analytics';
import { createEventLookup, createMemberLookup } from './analyticsUtils';

export function useMemberPerformance(
  members: Member[],
  attendance: Attendance[],
  events: Event[],
  limit: number = 10
): MemberPerformance[] {
  return useMemo(() => {
    const eventLookup = createEventLookup(events);
    const memberLookup = createMemberLookup(members);
    
    // Aggregate data in single pass, avoiding duplicates
    const memberStats = new Map<string, { points: number; eventsAttended: Set<string> }>();

    attendance.forEach((att) => {
      if (att.attended) {
        const event = eventLookup.get(att.event_id);
        if (event) {
          const stats = memberStats.get(att.user_id) || { points: 0, eventsAttended: new Set<string>() };
          
          // Only count each event once per user (avoid duplicate attendance records)
          if (!stats.eventsAttended.has(att.event_id)) {
            stats.points += event.point_value;
            stats.eventsAttended.add(att.event_id);
            memberStats.set(att.user_id, stats);
          }
        }
      }
    });

    // Transform to array with member details
    const performance: MemberPerformance[] = [];
    memberStats.forEach((stats, userId) => {
      const member = memberLookup.get(userId);
      if (member && member.role === 'brother') { // Only include brothers in leaderboard
        performance.push({
          userId,
          name: `${member.first_name} ${member.last_name}`,
          pledgeClass: member.pledge_class,
          points: stats.points,
          eventsAttended: stats.eventsAttended.size,
          attendanceRate: events.length > 0 ? (stats.eventsAttended.size / events.length) * 100 : 0,
        });
      }
    });

    // Sort and limit
    return performance.sort((a, b) => b.points - a.points).slice(0, limit);
  }, [members, attendance, events, limit]);
}
