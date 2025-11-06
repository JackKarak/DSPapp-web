/**
 * usePointsData Hook
 * 
 * Handles all data fetching, state management, and refresh logic
 * for the points screen using a reducer pattern
 */

import { useCallback, useReducer, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { POINT_REQUIREMENTS } from '../../constants/points/pointRequirements';

// State type
export type PointsState = {
  pointsByCategory: Record<string, number>;
  pillarsMet: number;
  previousPillarsMet: number;
  loading: boolean;
  refreshing: boolean;
  leaderboard: Array<{
    name: string;
    totalPoints: number;
    rank: number;
  }>;
  userRank: {
    name: string;
    totalPoints: number;
    rank: number;
  } | null;
  error: string | null;
};

// Action types
type Action =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_REFRESHING'; refreshing: boolean }
  | { type: 'SET_DATA'; data: Partial<PointsState> }
  | { type: 'SET_ERROR'; error: string };

// Reducer
function reducer(state: PointsState, action: Action): PointsState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_REFRESHING':
      return { ...state, refreshing: action.refreshing };
    case 'SET_DATA':
      return { 
        ...state, 
        ...action.data, 
        loading: false, 
        refreshing: false,
        error: null 
      };
    case 'SET_ERROR':
      return { 
        ...state, 
        error: action.error, 
        loading: false, 
        refreshing: false 
      };
    default:
      return state;
  }
}

// Initial state
const initialState: PointsState = {
  pointsByCategory: {},
  pillarsMet: 0,
  previousPillarsMet: 0,
  loading: true,
  refreshing: false,
  leaderboard: [],
  userRank: null,
  error: null,
};

export function usePointsData() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Fetch all data using SINGLE RPC call
  const fetchAllData = useCallback(async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        dispatch({ type: 'SET_ERROR', error: 'Authentication failed. Please log in again.' });
        return;
      }

      // SINGLE RPC CALL - Get everything at once!
      // SECURITY: RPC uses auth.uid() internally - no user_id parameter needed
      const { data: dashboardData, error: dashboardError } = await supabase
        .rpc('get_points_dashboard');

      if (dashboardError) {
        console.error('Dashboard fetch error:', dashboardError);
        dispatch({ type: 'SET_ERROR', error: `Failed to load points data: ${dashboardError.message}` });
        return;
      }

      if (!dashboardData) {
        dispatch({ type: 'SET_ERROR', error: 'No points data received. Please contact support.' });
        return;
      }

      // Parse the returned JSON
      const categoryPoints = dashboardData.categoryPoints || {};
      const userRank = dashboardData.userRank || null;
      const leaderboard = dashboardData.leaderboard || [];

      // Calculate pillars met
      const metCount = Object.entries(POINT_REQUIREMENTS).reduce((count, [cat, config]) => {
        return (categoryPoints[cat] || 0) >= config.required ? count + 1 : count;
      }, 0);

      // SINGLE STATE UPDATE - all data loaded at once
      dispatch({
        type: 'SET_DATA',
        data: {
          pointsByCategory: categoryPoints,
          previousPillarsMet: state.pillarsMet, // Save previous for confetti
          pillarsMet: metCount,
          leaderboard,
          userRank,
        },
      });

    } catch (error: any) {
      console.error('Error in fetchAllData:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        error: error.message || 'An unexpected error occurred. Please try again.' 
      });
    }
  }, [state.pillarsMet]);

  // Use focus-aware loading instead of useEffect
  useFocusEffect(
    useCallback(() => {
      dispatch({ type: 'SET_LOADING', loading: true });
      fetchAllData();
    }, [fetchAllData])
  );

  // Refresh handler
  const onRefresh = useCallback(async () => {
    dispatch({ type: 'SET_REFRESHING', refreshing: true });
    await fetchAllData();
  }, [fetchAllData]);

  // Calculate confetti trigger - must be memoized
  const totalPillars = Object.keys(POINT_REQUIREMENTS).length;
  const triggerConfetti = useMemo(() => {
    return state.previousPillarsMet < totalPillars && state.pillarsMet >= totalPillars;
  }, [state.previousPillarsMet, state.pillarsMet, totalPillars]);

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    return (state.pillarsMet / totalPillars) * 100;
  }, [state.pillarsMet, totalPillars]);

  return {
    state,
    onRefresh,
    triggerConfetti,
    completionPercentage,
    totalPillars,
  };
}
