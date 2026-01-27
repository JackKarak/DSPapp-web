/**
 * useOfficerAnalytics Hook
 * Fetches and computes officer analytics data
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';

// Database response type matching the SQL function output
export type AnalyticsDashboardData = {
  officer_position: string;
  total_regular_users: number;
  event_stats: {
    total: number;
    upcoming: number;
    by_point_type: Record<string, number>;
    by_month: Record<string, number>;
    attendance_trend: { month: string; count: number }[];
  };
  attendance_stats: {
    by_event: Record<string, number>;
    unique_attendees: number;
    total_attendances: number;
  };
  user_demographics: {
    total: number;
    by_pledge_class: Record<string, number>;
    by_majors: Record<string, number>;
    by_expected_graduation: Record<string, number>;
  };
  feedback_stats: {
    avg_rating: number;
    would_attend_again_pct: number;
    well_organized_pct: number;
    recent_comments: Array<{
      rating: number;
      comments: string;
      created_at: string;
      event_id: string;
    }>;
  };
  individual_events: Array<{
    id: string;
    title: string;
    start_time: string;
    location: string;
    point_value: number;
    point_type: string;
    creator_name: string;
    attendance_count: number;
  }>;
};

export type ComputedMetrics = {
  averageAttendance: number;
  engagementRate: number;
  growthRate: number;
  enrichedEvents: Array<{
    id: string;
    title: string;
    start_time: string;
    location: string;
    point_value: number;
    point_type: string;
    creator_name: string;
    attendance_count: number;
    attendance_rate: number;
  }>;
};

export type ComparativeData = {
  allOfficersAvgAttendance: number;
  allOfficersAvgRating: number;
  allOfficersEngagementRate: number;
};

export const useOfficerAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<AnalyticsDashboardData | null>(null);
  const [comparativeData, setComparativeData] = useState<ComparativeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics data - SINGLE DATABASE CALL
  const fetchAnalytics = useCallback(async () => {
    try {
      setError(null);
      
      // Step 1: Get current user's officer position
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error('No user');

      const { data: officerData, error: officerError } = await supabase
        .from('users')
        .select('officer_position')
        .eq('user_id', user.id)
        .single();

      if (officerError) throw new Error(`Failed to fetch officer data: ${officerError.message}`);
      if (!officerData?.officer_position) throw new Error('User is not assigned an officer position');

      // Step 2: SINGLE RPC CALL to get ALL analytics data
      const { data, error: rpcError } = await supabase.rpc('get_officer_analytics_dashboard', {
        p_officer_position: officerData.officer_position
      });

      if (rpcError) throw rpcError;
      if (!data) throw new Error('No data returned from analytics function');

      // Step 3: SINGLE state update with all data
      setDashboardData(data as AnalyticsDashboardData);

      // Step 4: Fetch comparative data (all officers' averages)
      await fetchComparativeData();
      
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    }
  }, []);

  // Fetch comparative metrics for all officers
  const fetchComparativeData = useCallback(async () => {
    try {
      // Get all events with their attendance and ratings
      const { data: allEvents, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          created_by,
          event_attendance!inner(user_id),
          event_feedback(rating)
        `)
        .not('created_by', 'is', null);

      if (eventsError) throw eventsError;

      // Get total regular users for engagement calculation
      const { data: regularUsers, error: usersError } = await supabase
        .from('users')
        .select('user_id')
        .is('officer_position', null);

      if (usersError) throw usersError;

      const totalRegularUsers = regularUsers?.length || 1;

      // Add null check for allEvents
      if (!allEvents || allEvents.length === 0) {
        setComparativeData({
          allOfficersAvgAttendance: 0,
          allOfficersAvgRating: 0,
          allOfficersEngagementRate: 0,
        });
        return;
      }

      // Calculate averages across all officers
      const eventGroups = allEvents.reduce((acc: any, event: any) => {
        const attendanceCount = event.event_attendance?.length || 0;
        const ratings = event.event_feedback?.map((f: any) => f.rating).filter((r: any) => r) || [];
        const avgRating = ratings.length > 0 ? ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length : 0;
        
        if (!acc[event.created_by]) {
          acc[event.created_by] = { attendances: [], ratings: [] };
        }
        acc[event.created_by].attendances.push(attendanceCount);
        if (avgRating > 0) acc[event.created_by].ratings.push(avgRating);
        
        return acc;
      }, {});

      const officerMetrics = Object.values(eventGroups).map((officer: any) => ({
        avgAttendance: officer.attendances.reduce((sum: number, a: number) => sum + a, 0) / officer.attendances.length,
        avgRating: officer.ratings.length > 0 ? officer.ratings.reduce((sum: number, r: number) => sum + r, 0) / officer.ratings.length : 0,
        engagementRate: totalRegularUsers > 0 ? 
          (officer.attendances.reduce((sum: number, a: number) => sum + a, 0) / (officer.attendances.length * totalRegularUsers)) * 100 : 0,
      }));

      const allOfficersAvgAttendance = officerMetrics.length > 0 ?
        officerMetrics.reduce((sum, o) => sum + o.avgAttendance, 0) / officerMetrics.length : 0;
      
      const validRatings = officerMetrics.filter(o => o.avgRating > 0);
      const allOfficersAvgRating = validRatings.length > 0 ?
        validRatings.reduce((sum, o) => sum + o.avgRating, 0) / validRatings.length : 0;
      
      const allOfficersEngagementRate = officerMetrics.length > 0 ?
        officerMetrics.reduce((sum, o) => sum + o.engagementRate, 0) / officerMetrics.length : 0;

      setComparativeData({
        allOfficersAvgAttendance,
        allOfficersAvgRating,
        allOfficersEngagementRate,
      });
      
    } catch (err) {
      console.error('Error fetching comparative data:', err);
      // Don't fail the whole component if comparative data fails
      setComparativeData({
        allOfficersAvgAttendance: 0,
        allOfficersAvgRating: 0,
        allOfficersEngagementRate: 0,
      });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      await fetchAnalytics();
      if (isMounted) setLoading(false);
    };
    loadData();
    return () => { isMounted = false; };
  }, [fetchAnalytics]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  }, [fetchAnalytics]);

  // Memoized computed values to avoid recalculation on every render
  const computedMetrics = useMemo((): ComputedMetrics | null => {
    if (!dashboardData) return null;

    const { event_stats, attendance_stats, total_regular_users } = dashboardData;
    
    // Calculate average attendance per event
    const totalAttendances = attendance_stats?.total_attendances || 0;
    const eventCount = event_stats?.total || 1;
    const averageAttendance = totalAttendances / eventCount;

    // Calculate engagement rate (capped at 100% to handle data anomalies)
    const engagementRate = total_regular_users > 0 
      ? Math.min(100, ((attendance_stats?.unique_attendees || 0) / total_regular_users) * 100)
      : 0;

    // Calculate growth rate from attendance trend (only if sufficient data)
    const trend = event_stats?.attendance_trend || [];
    let growthRate = 0;
    if (trend && trend.length >= 6) {
      const currentQuarter = trend.slice(3).reduce((sum, m) => sum + m.count, 0);
      const previousQuarter = trend.slice(0, 3).reduce((sum, m) => sum + m.count, 0);
      growthRate = previousQuarter > 0 
        ? ((currentQuarter - previousQuarter) / previousQuarter) * 100
        : currentQuarter > 0 ? 100 : 0;
    }

    // Enrich individual events with attendance rate - add null check
    const enrichedEvents = (dashboardData.individual_events || []).map(event => {
      const rate = total_regular_users > 0 
        ? Math.min(100, (event.attendance_count / total_regular_users) * 100)
        : 0;
      return {
        ...event,
        attendance_rate: rate,
      };
    });

    return {
      averageAttendance,
      engagementRate,
      growthRate,
      enrichedEvents,
    };
  }, [dashboardData]);

  return {
    loading,
    refreshing,
    dashboardData,
    computedMetrics,
    comparativeData,
    error,
    onRefresh,
  };
};
