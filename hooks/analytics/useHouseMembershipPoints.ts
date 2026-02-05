/**
 * useHouseMembershipPoints Hook
 * Calculates points breakdown by house membership
 */

import { useMemo } from 'react';
import type { Member, Event, Attendance } from '../../types/analytics';

export interface HouseMembershipPoints {
  houseMembership: string;
  totalPoints: number;
  memberCount: number;
  avgPointsPerMember: number;
}

export function useHouseMembershipPoints(
  members: Member[],
  attendance: Attendance[],
  events: Event[]
): HouseMembershipPoints[] {
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

    // Group by house membership
    const houseStats = new Map<string, { totalPoints: number; memberCount: number }>();

    members.forEach(member => {
      const houseMembership = member.house_membership || 'Not Specified';
      const memberPoints = memberPointsMap.get(member.user_id) || 0;
      
      const stats = houseStats.get(houseMembership) || { totalPoints: 0, memberCount: 0 };
      stats.totalPoints += memberPoints;
      stats.memberCount += 1;
      houseStats.set(houseMembership, stats);
    });

    // Convert to array and calculate averages
    return Array.from(houseStats.entries())
      .map(([houseMembership, stats]) => ({
        houseMembership,
        totalPoints: stats.totalPoints,
        memberCount: stats.memberCount,
        avgPointsPerMember: stats.memberCount > 0 ? stats.totalPoints / stats.memberCount : 0,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }, [members, attendance, events]);
}
