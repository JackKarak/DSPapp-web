/**
 * useCategoryBreakdown Hook
 * Calculates points breakdown by category
 */

import { useMemo } from 'react';
import type { Event, Attendance, Member, CategoryPointsBreakdown } from '../../types/analytics';

export function useCategoryBreakdown(
  events: Event[],
  attendance: Attendance[],
  members: Member[]
): CategoryPointsBreakdown[] {
  return useMemo(() => {
    // Handle null/undefined/empty arrays
    const safeEvents = events || [];
    const safeAttendance = attendance || [];
    const safeMembers = members || [];
    
    const categoryMap = new Map<string, { 
      totalPoints: number; 
      eventCount: number; 
      uniqueAttendances: Set<string>; 
    }>();
    
    // Define standard categories
    const standardCategories = [
      'Brotherhood',
      'Service',
      'Professionalism',
      'Scholarship',
      'DEI',
      'H&W',
      'Fundraising',
    ];
    
    // Initialize all categories
    standardCategories.forEach(cat => {
      categoryMap.set(cat, { totalPoints: 0, eventCount: 0, uniqueAttendances: new Set() });
    });
    
    // Aggregate points by category
    safeEvents.forEach((event) => {
      // Only count approved events that have already passed and give points
      const eventDate = new Date(event.start_time);
      const now = new Date();
      const isApproved = event.status === 'approved';
      const hasPassed = eventDate < now;
      const givesPoints = event.point_value > 0;
      
      if (!isApproved || !hasPassed || !givesPoints) {
        return; // Skip unapproved, future, or non-point events
      }
      
      // Normalize category name (handle case variations)
      const normalizedCategory = event.point_type.trim();
      let categoryKey = normalizedCategory;
      
      // Map variations to standard names
      const lowerCategory = normalizedCategory.toLowerCase();
      if (lowerCategory.includes('brother')) categoryKey = 'Brotherhood';
      else if (lowerCategory.includes('service')) categoryKey = 'Service';
      else if (lowerCategory.includes('professional')) categoryKey = 'Professionalism';
      else if (lowerCategory.includes('scholar')) categoryKey = 'Scholarship';
      else if (lowerCategory.includes('dei') || lowerCategory.includes('diversity')) categoryKey = 'DEI';
      else if (lowerCategory.includes('h&w') || lowerCategory.includes('health') || lowerCategory.includes('wellness')) categoryKey = 'H&W';
      else if (lowerCategory.includes('fund')) categoryKey = 'Fundraising';
      
      // Get or create category stats
      const stats = categoryMap.get(categoryKey) || { totalPoints: 0, eventCount: 0, uniqueAttendances: new Set() };
      
      // Count event
      stats.eventCount += 1;
      
      // Count unique attendance and points (avoid double counting)
      // Note: attended field is undefined, so just check event_id match
      const eventAttendance = safeAttendance.filter(a => a.event_id === event.id);
      
      eventAttendance.forEach(att => {
        const key = `${att.user_id}-${att.event_id}`;
        if (!stats.uniqueAttendances.has(key)) {
          stats.uniqueAttendances.add(key);
          stats.totalPoints += event.point_value;
        }
      });
      
      categoryMap.set(categoryKey, stats);
    });
    
    // Convert to array and calculate totals
    const memberCount = members.length || 1; // Avoid division by zero
    
    const result = Array.from(categoryMap.entries())
      .map(([category, stats]) => ({
        category,
        totalPoints: stats.totalPoints,
        eventCount: stats.eventCount,
        attendanceCount: stats.uniqueAttendances.size,
        averagePoints: stats.uniqueAttendances.size > 0 ? stats.totalPoints / stats.uniqueAttendances.size : 0,
        averageAttendancePerMember: memberCount > 0 ? stats.uniqueAttendances.size / memberCount : 0, // e.g., 4.7 out of 6 possible
      }))
      .filter(item => item.eventCount > 0) // Only show categories with events
      .sort((a, b) => b.totalPoints - a.totalPoints); // Sort by total points descending
    
    return result;
  }, [events, attendance, members]);
}
