/**
 * useHealthMetrics Hook
 * Calculates fraternity health metrics
 */

import { useMemo } from 'react';
import type { Member, Event, Attendance, HealthMetrics } from '../../types/analytics';
import { createEventLookup, getActiveBrothers } from './analyticsUtils';

export function useHealthMetrics(
  members: Member[],
  attendance: Attendance[],
  events: Event[]
): HealthMetrics {
  return useMemo(() => {
    // Handle null/undefined/empty arrays
    if (!members || !Array.isArray(members) || members.length === 0) {
      return {
        totalMembers: 0,
        activeMembers: 0,
        retentionRate: 0,
        avgAttendanceRate: 0,
        avgPoints: 0,
        isEmpty: true,
      };
    }

    const safeAttendance = attendance || [];
    const safeEvents = events || [];
    
    // Total members: brothers and officers only
    const brothers = members.filter(m => m.role === 'brother' || m.role === 'officer' || m.role === 'president');
    const totalMembers = brothers.length;
    
    // Active members: attended at least 1 event OR 5% of events (whichever is greater)
    const eventCount = safeEvents.length;
    const attendanceThreshold = Math.max(1, Math.ceil(eventCount * 0.05));
    
    // Count each member's attendance
    const memberAttendanceCounts = new Map<string, number>();
    safeAttendance.forEach(att => {
      if (att.attended) {
        const count = memberAttendanceCounts.get(att.user_id) || 0;
        memberAttendanceCounts.set(att.user_id, count + 1);
      }
    });
    
    const activeMembers = brothers.filter(m => {
      const attendedCount = memberAttendanceCounts.get(m.user_id) || 0;
      return attendedCount >= attendanceThreshold;
    }).length;
    
    const retentionRate = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0;
    const brotherIds = new Set(brothers.map(b => b.user_id));
    
    // Get unique user-event combinations to avoid double counting
    const uniqueAttendances = new Map<string, boolean>();
    safeAttendance.forEach((att) => {
      // Only count attendance for active members
      if (brotherIds.has(att.user_id)) {
        const key = `${att.user_id}-${att.event_id}`;
        if (!uniqueAttendances.has(key)) {
          uniqueAttendances.set(key, att.attended);
        }
      }
    });

    // Count how many people actually attended (not just RSVP'd)
    const actualAttendances = Array.from(uniqueAttendances.values()).filter(attended => attended).length;
    
    // Calculate attendance rate: actual attendances / total possible (active members × events)
    const totalPossibleAttendances = brothers.length * safeEvents.length;
    const avgAttendanceRate = totalPossibleAttendances > 0 
      ? (actualAttendances / totalPossibleAttendances) * 100 
      : 0;

    // Calculate points using lookup map for O(1) access
    const eventLookup = createEventLookup(safeEvents);
    const memberPoints = new Map<string, number>();

    safeAttendance.forEach((att) => {
      if (att.attended && brotherIds.has(att.user_id)) {
        const event = eventLookup.get(att.event_id);
        if (event) {
          const currentPoints = memberPoints.get(att.user_id) || 0;
          memberPoints.set(att.user_id, currentPoints + event.point_value);
        }
      }
    });

    // Calculate average points: sum all active member points / total active members (including those with 0)
    let totalPoints = 0;
    brothers.forEach(brother => {
      totalPoints += memberPoints.get(brother.user_id) || 0;
    });
    
    const avgPoints = brothers.length > 0 ? totalPoints / brothers.length : 0;

    return {
      totalMembers,
      activeMembers,
      retentionRate,
      avgAttendanceRate,
      avgPoints,
    };
  }, [members, attendance, events]);
}
