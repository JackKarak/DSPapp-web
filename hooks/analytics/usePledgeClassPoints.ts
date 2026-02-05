/**
 * usePledgeClassPoints Hook
 * Calculates average points by pledge class
 */

import { useMemo } from 'react';
import type { Member, Event, Attendance } from '../../types/analytics';

export interface PledgeClassPoints {
  pledgeClass: string;
  totalPoints: number;
  memberCount: number;
  avgPointsPerMember: number;
}

export function usePledgeClassPoints(
  members: Member[],
  attendance: Attendance[],
  events: Event[]
): PledgeClassPoints[] {
  return useMemo(() => {
    if (!members || !attendance || !events) return [];

    // Create event lookup for quick access to point values
    const eventMap = new Map(events.map(e => [e.id, e]));

    // Calculate points per member
    const memberPointsMap = new Map<string, number>();
    
    attendance.forEach(att => {
      const event = eventMap.get(att.event_id);
      if (event) {
        const currentPoints = memberPointsMap.get(att.user_id) || 0;
        memberPointsMap.set(att.user_id, currentPoints + event.point_value);
      }
    });

    // Group by pledge class
    const classStats = new Map<string, { totalPoints: number; memberCount: number }>();

    members.forEach(member => {
      const pledgeClass = member.pledge_class || 'Unknown';
      const memberPoints = memberPointsMap.get(member.user_id) || 0;
      
      const stats = classStats.get(pledgeClass) || { totalPoints: 0, memberCount: 0 };
      stats.totalPoints += memberPoints;
      stats.memberCount += 1;
      classStats.set(pledgeClass, stats);
    });

    // Convert to array and calculate averages
    return Array.from(classStats.entries())
      .map(([pledgeClass, stats]) => ({
        pledgeClass,
        totalPoints: stats.totalPoints,
        memberCount: stats.memberCount,
        avgPointsPerMember: stats.memberCount > 0 ? stats.totalPoints / stats.memberCount : 0,
      }))
      .sort((a, b) => {
        // Sort by class name (e.g., Fall 2023, Spring 2024)
        return a.pledgeClass.localeCompare(b.pledgeClass);
      });
  }, [members, attendance, events]);
}
