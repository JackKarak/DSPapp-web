/**
 * useMemberPoints Hook
 * 
 * Fetches points breakdown by category for a specific member
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

interface MemberPointsData {
  pointsByCategory: Record<string, number>;
  totalPoints: number;
}

export function useMemberPoints() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMemberPoints = useCallback(async (userId: string): Promise<MemberPointsData | null> => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all events the member attended with their point types
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('event_attendance')
        .select(`
          event_id,
          events!inner(
            id,
            point_type,
            point_value
          )
        `)
        .eq('user_id', userId);

      if (attendanceError) throw attendanceError;

      // Fetch approved appeals
      const { data: appeals, error: appealsError } = await supabase
        .from('point_appeal')
        .select(`
          event_id,
          events!inner(
            point_type,
            point_value
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'approved');

      if (appealsError) throw appealsError;

      // Initialize category totals
      const categoryPoints: Record<string, number> = {
        'Brotherhood': 0,
        'Scholarship': 0,
        'Professionalism': 0,
        'Service': 0,
        'DEI': 0,
        'Fundraising': 0,
        'H&W': 0,
      };

      // Helper function to normalize category names
      const normalizeCategory = (category: string): string => {
        const lower = category.toLowerCase();
        if (lower.includes('brother')) return 'Brotherhood';
        if (lower.includes('scholar')) return 'Scholarship';
        if (lower.includes('professional')) return 'Professionalism';
        if (lower.includes('service')) return 'Service';
        if (lower.includes('dei') || lower.includes('diversity')) return 'DEI';
        if (lower.includes('fund')) return 'Fundraising';
        if (lower.includes('h&w') || lower.includes('health') || lower.includes('wellness')) return 'H&W';
        return category; // Return as-is if no match
      };

      // Calculate points from attendance
      attendanceData?.forEach((attendance: any) => {
        const event = attendance.events;
        if (!event || !event.point_type) return;

        const normalizedCategory = normalizeCategory(event.point_type);
        
        // Calculate points from event value
        const points = event.point_value || 0;

        if (categoryPoints.hasOwnProperty(normalizedCategory)) {
          categoryPoints[normalizedCategory] += points;
        }
      });

      // Add points from approved appeals
      appeals?.forEach((appeal: any) => {
        const event = appeal.events;
        if (!event || !event.point_type) return;

        const normalizedCategory = normalizeCategory(event.point_type);
        const points = event.point_value || 0;

        if (categoryPoints.hasOwnProperty(normalizedCategory)) {
          categoryPoints[normalizedCategory] += points;
        }
      });

      // Calculate total
      const totalPoints = Object.values(categoryPoints).reduce((sum, val) => sum + val, 0);

      return {
        pointsByCategory: categoryPoints,
        totalPoints,
      };
    } catch (err: any) {
      console.error('Error fetching member points:', err);
      setError(err.message || 'Failed to fetch member points');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    fetchMemberPoints,
    loading,
    error,
  };
}
