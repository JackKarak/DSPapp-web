/**
 * useAnalyticsData Hook
 * Manages data fetching for analytics
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { analyticsReducer, initialState } from './analyticsReducer';
import type { AnalyticsState } from '../../types/analytics';

export function useAnalyticsData() {
  const [state, dispatch] = useReducer(analyticsReducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ============================================================================
  // DATA FETCHING - Paginated with abort support
  // ============================================================================

  const fetchMembers = useCallback(async () => {
    try {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      // Fetch ALL members with role='brother' for analytics (no pagination)
      const { data, error, count } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('role', 'brother')
        .order('last_name', { ascending: true });

      if (error) throw error;

      dispatch({ type: 'SET_MEMBERS', payload: { members: data || [], hasMore: false } });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to load members' });
      }
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const { start, end } = state.dateRange;

      // Fetch ALL events in date range for analytics (no pagination)
      const { data, error, count } = await supabase
        .from('events')
        .select('*', { count: 'exact' })
        .eq('status', 'approved')
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: false });

      if (error) throw error;

      dispatch({ type: 'SET_EVENTS', payload: { events: data || [], hasMore: false } });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to load events' });
      }
    }
  }, [state.dateRange]);

  const fetchAttendance = useCallback(async () => {
    try {
      // Fetch only for loaded events to limit data
      if (state.events.length === 0) return;

      const eventIds = state.events.map((e) => e.id);

      const { data, error } = await supabase
        .from('event_attendance')
        .select('*')
        .in('event_id', eventIds);

      if (error) throw error;

      dispatch({ type: 'SET_ATTENDANCE', payload: data || [] });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to load attendance' });
      }
    }
  }, [state.events]);

  // ============================================================================
  // EFFECTS - Coordinated data loading
  // ============================================================================

  useEffect(() => {
    fetchMembers();
    return () => abortControllerRef.current?.abort();
  }, [fetchMembers]);

  useEffect(() => {
    if (state.members.length > 0) {
      fetchEvents();
    }
  }, [fetchEvents, state.members.length]);

  useEffect(() => {
    if (state.events.length > 0) {
      fetchAttendance();
    }
  }, [fetchAttendance, state.events.length]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleRefresh = useCallback(async () => {
    dispatch({ type: 'SET_REFRESHING', payload: true });
    dispatch({ type: 'RESET' });
    await fetchMembers();
  }, [fetchMembers]);

  const handleLoadMoreEvents = useCallback(() => {
    if (state.eventsPagination.hasMore && !state.loading) {
      dispatch({ type: 'LOAD_MORE_EVENTS' });
    }
  }, [state.eventsPagination.hasMore, state.loading]);

  return {
    state,
    dispatch,
    handleRefresh,
    handleLoadMoreEvents,
  };
}
