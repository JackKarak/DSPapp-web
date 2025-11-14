/**
 * useAccountData Hook
 * 
 * Purpose: Single source of truth for all account data fetching
 * 
 * This hook centralizes all data fetching logic that was previously scattered
 * throughout the account.tsx component. It uses the RPC function `get_account_dashboard`
 * to fetch all data in a single database call, dramatically improving performance.
 * 
 * Impact:
 * - Removes 15+ database calls from component
 * - Makes data testable with mocks
 * - Centralizes loading/error states
 * - Eliminates race conditions
 */

import { useCallback, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { checkAuthentication, handleAuthenticationRedirect } from '../../../lib/auth';
import { UserProfile, Analytics } from '../../../types/hooks';
import { Event, PointAppeal } from '../../../types/account';

interface UseAccountDataReturn {
  loading: boolean;
  error: string | null;
  profile: UserProfile | null;
  events: Event[];
  analytics: Analytics | null;
  appeals: PointAppeal[];
  appealableEvents: Event[];
  submittedFeedback: Set<string>;
  refreshData: () => Promise<void>;
}

/**
 * Custom hook for managing account data fetching and state
 * 
 * @returns {UseAccountDataReturn} Account data and management functions
 * 
 * @example
 * ```tsx
 * const { loading, error, profile, events, refreshData } = useAccountData();
 * 
 * if (loading) return <LoadingState />;
 * if (error) return <ErrorState message={error} />;
 * 
 * return <ProfileSection profile={profile} />;
 * ```
 */
export const useAccountData = (): UseAccountDataReturn => {
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [appeals, setAppeals] = useState<PointAppeal[]>([]);
  const [appealableEvents, setAppealableEvents] = useState<Event[]>([]);
  const [submittedFeedbackEvents, setSubmittedFeedbackEvents] = useState<Set<string>>(new Set());

  /**
   * Fetch all account data in a single RPC call
   * Uses the optimized `get_account_dashboard` database function
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Step 1: Check authentication
      const authResult = await checkAuthentication();
      
      if (!authResult.isAuthenticated) {
        console.error('Authentication failed:', authResult.error);
        handleAuthenticationRedirect();
        return;
      }
      
      const user = authResult.user;

      // Step 2: SINGLE RPC CALL - Get everything at once!
      // This dramatically improves performance over 15+ individual queries
      // SECURITY: RPC uses auth.uid() internally - no user_id parameter needed
      const { data: dashboardData, error: dashboardError } = await supabase
        .rpc('get_account_dashboard');

      if (dashboardError) {
        console.error('Dashboard fetch error:', dashboardError);
        throw new Error(`Failed to load account data: ${dashboardError.message}`);
      }

      if (!dashboardData) {
        throw new Error('No account data received. Please contact support.');
      }

      // Parse the returned JSON
      const profileData = dashboardData.profile;
      const eventsData = dashboardData.events || [];
      const analyticsData = dashboardData.analytics || {};
      const userAppeals = dashboardData.user_appeals || [];
      const appealableEventsData = dashboardData.appealable_events || [];

      // Check if account is approved
      if (!profileData.approved) {
        Alert.alert('Pending Approval', 'Your account is awaiting approval.');
        setLoading(false);
        return;
      }

      // Step 3: Update profile state
      setProfile({
        first_name: profileData.first_name || null,
        last_name: profileData.last_name || null,
        phone_number: profileData.phone_number || null,
        email: profileData.email || null,
        uid: profileData.uid || null,
        role: profileData.role || null,
        majors: profileData.majors || null,
        minors: profileData.minors || null,
        house_membership: profileData.house_membership || null,
        race: profileData.race || null,
        pronouns: profileData.pronouns || null,
        living_type: profileData.living_type || null,
        gender: profileData.gender || null,
        sexual_orientation: profileData.sexual_orientation || null,
        expected_graduation: profileData.expected_graduation || null,
        pledge_class: profileData.pledge_class || null,
        last_profile_update: profileData.last_profile_update || null,
        approved: profileData.approved,
      });

      // Step 4: Update events (already sorted and deduplicated by database)
      setEvents(eventsData);

      // Step 5: Update analytics (already calculated by database)
      setAnalytics({
        totalPoints: analyticsData.totalPoints || 0,
        currentStreak: analyticsData.currentStreak || 0,
        longestStreak: analyticsData.longestStreak || 0,
        eventsThisMonth: analyticsData.eventsThisMonth || 0,
        eventsThisSemester: analyticsData.eventsThisSemester || 0,
        attendanceRate: analyticsData.attendanceRate || 0,
        rankInPledgeClass: analyticsData.rankInPledgeClass || 0,
        totalInPledgeClass: analyticsData.totalInPledgeClass || 0,
        rankInFraternity: analyticsData.rankInFraternity || 0,
        totalInFraternity: analyticsData.totalInFraternity || 0,
        achievements: analyticsData.achievements || [],
        monthlyProgress: analyticsData.monthlyProgress || [],
      });

      // Step 6: Update appeals data
      setAppeals(userAppeals);
      setAppealableEvents(appealableEventsData);

      // Step 7: Fetch event feedback submissions (small query, kept separate)
      // Filter out null/undefined event IDs
      const eventIds = Array.isArray(eventsData) 
        ? eventsData
            .map((event: any) => event?.id)
            .filter((id: any) => id != null && id !== '') 
        : [];
      
      if (eventIds.length > 0) {
        const { data: existingFeedback, error: feedbackError } = await supabase
          .from('event_feedback')
          .select('event_id')
          .eq('user_id', user.id)
          .in('event_id', eventIds);
        
        if (!feedbackError && existingFeedback) {
          const submittedEventIds = new Set(
            existingFeedback.map(feedback => feedback.event_id)
          );
          setSubmittedFeedbackEvents(submittedEventIds);
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An unexpected error occurred';
      console.error('useAccountData fetchData error:', err);
      setError(errorMessage);
      Alert.alert('Error Loading Account', errorMessage);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies - RPC function is self-contained

  /**
   * Refresh all account data
   * Can be called from pull-to-refresh or after data mutations
   */
  const refreshData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    loading,
    error,
    profile,
    events,
    analytics,
    appeals,
    appealableEvents,
    submittedFeedback: submittedFeedbackEvents, // Alias for component compatibility
    refreshData,
  };
};
