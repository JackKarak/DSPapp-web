/**
 * useAccount - Master Hook
 * 
 * Complete account management hook that combines:
 * - Data fetching (useAccountData)
 * - Profile editing (useProfileEdit)
 * - Modal state management
 * - Test bank functionality
 * - Event feedback
 * - Point appeals
 * - Data consent
 */

import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { checkAuthentication, handleAuthenticationRedirect } from '../../../lib/auth';
import { formatDateInEST } from '../../../lib/dateUtils';
import { uploadFileToStorage } from '../../../lib/fileUpload';
import { saveConsentPreferences } from '../../../lib/dataConsent';
import { UserProfile, Analytics, ProfileFormData } from '../../../types/hooks';
import { Event, PointAppeal } from '../../../types/account';

// Profile edit cooldown in days
const PROFILE_EDIT_COOLDOWN_DAYS = 7;

interface TestBankSubmission {
  id: string;
  class_code: string;
  file_type: string;
  status: string;
  created_at: string;
}

export const useAccount = () => {
  // ============================================================================
  // DATA STATE
  // ============================================================================
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [appeals, setAppeals] = useState<PointAppeal[]>([]);
  const [appealableEvents, setAppealableEvents] = useState<Event[]>([]);
  const [submittedFeedback, setSubmittedFeedback] = useState<Set<string>>(new Set());
  const [testBankSubmissions, setTestBankSubmissions] = useState<TestBankSubmission[]>([]);

  // ============================================================================
  // PROFILE EDITING STATE
  // ============================================================================
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    majors: '',
    minors: '',
    houseMembership: '',
    race: '',
    pronouns: '',
    livingType: '',
    gender: '',
    sexualOrientation: '',
    expectedGraduation: '',
  });
  const [userConsent, setUserConsent] = useState({
    analytics: false,
    demographics: false,
    academic: false,
    housing: false,
  });
  const [canEdit, setCanEdit] = useState(false);
  const [nextEditDate, setNextEditDate] = useState<Date | null>(null);
  const [daysUntilEdit, setDaysUntilEdit] = useState(0);

  // ============================================================================
  // MODAL STATE
  // ============================================================================
  const [consentModalVisible, setConsentModalVisible] = useState(false);
  const [testBankModalVisible, setTestBankModalVisible] = useState(false);
  const [appealModalVisible, setAppealModalVisible] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);

  // ============================================================================
  // EXPANDED SECTIONS STATE
  // ============================================================================
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const [testBankExpanded, setTestBankExpanded] = useState(false);

  // ============================================================================
  // TEST BANK STATE
  // ============================================================================
  const [testBankClassCode, setTestBankClassCode] = useState('');
  const [testBankFileType, setTestBankFileType] = useState<'test' | 'notes' | 'materials'>('test');
  const [testBankSelectedFile, setTestBankSelectedFile] = useState<any>(null);

  // ============================================================================
  // APPEAL STATE
  // ============================================================================
  const [selectedAppealEvent, setSelectedAppealEvent] = useState<Event | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealPictureUrl, setAppealPictureUrl] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  // ============================================================================
  // FEEDBACK STATE
  // ============================================================================
  const [selectedFeedbackEvent, setSelectedFeedbackEvent] = useState<Event | null>(null);
  const [feedbackData, setFeedbackData] = useState({
    rating: 5,
    would_attend_again: null as boolean | null,
    well_organized: null as boolean | null,
    comments: '',
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const fetchAccountData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check authentication
      const authResult = await checkAuthentication();
      
      if (!authResult.isAuthenticated) {
        console.error('Authentication failed:', authResult.error);
        handleAuthenticationRedirect();
        return;
      }
      
      const user = authResult.user;

      // Fetch dashboard data via RPC
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

      // Set profile state
      const userProfile: UserProfile = {
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
      };
      setProfile(userProfile);

      // Initialize form data from profile
      setFormData({
        majors: profileData.majors || '',
        minors: profileData.minors || '',
        houseMembership: profileData.house_membership || '',
        race: profileData.race || '',
        pronouns: profileData.pronouns || '',
        livingType: profileData.living_type || '',
        gender: profileData.gender || '',
        sexualOrientation: profileData.sexual_orientation || '',
        expectedGraduation: profileData.expected_graduation || '',
      });

      // Check if user can edit profile
      const lastUpdate = profileData.last_profile_update;
      if (!lastUpdate) {
        setCanEdit(true);
        setNextEditDate(null);
        setDaysUntilEdit(0);
      } else {
        const lastUpdateDate = new Date(lastUpdate);
        const now = new Date();
        const daysSince = Math.floor((now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24));
        const canEditNow = daysSince >= PROFILE_EDIT_COOLDOWN_DAYS;
        
        setCanEdit(canEditNow);
        
        if (!canEditNow) {
          const nextDate = new Date(lastUpdateDate);
          nextDate.setDate(nextDate.getDate() + PROFILE_EDIT_COOLDOWN_DAYS);
          setNextEditDate(nextDate);
          setDaysUntilEdit(PROFILE_EDIT_COOLDOWN_DAYS - daysSince);
        }
      }

      // Set events
      setEvents(eventsData);

      // Set analytics
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

      // Set appeals
      setAppeals(userAppeals);
      setAppealableEvents(appealableEventsData);

      // Fetch event feedback submissions
      const eventIds = eventsData
        .map((event: any) => event?.id)
        .filter((id: any) => id != null && id !== '');
      
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
          setSubmittedFeedback(submittedEventIds);
        }
      }

      // Fetch test bank submissions
      const { data: testBankData, error: testBankError } = await supabase
        .from('test_bank')
        .select('id, class_code, file_type, status, original_file_name, created_at')
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false });

      if (!testBankError && testBankData) {
        // Map created_at to uploaded_at for component compatibility
        const mappedData = testBankData.map(item => ({
          ...item,
          uploaded_at: item.created_at
        }));
        setTestBankSubmissions(mappedData);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('useAccount fetchAccountData error:', err);
      setError(errorMessage);
      Alert.alert('Error Loading Account', errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // REFRESH HANDLER
  // ============================================================================
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAccountData();
    setRefreshing(false);
  }, [fetchAccountData]);

  // ============================================================================
  // PROFILE EDITING
  // ============================================================================
  const startEditing = useCallback(() => {
    if (!canEdit) {
      Alert.alert(
        'Cannot Edit Profile',
        `You can edit your profile again on ${nextEditDate ? formatDateInEST(nextEditDate.toISOString(), { month: 'long', day: 'numeric', year: 'numeric' }) : 'a future date'}.`
      );
      return;
    }
    setIsEditing(true);
  }, [canEdit, nextEditDate]);

  const cancelEdit = useCallback(() => {
    // Reset form data to profile values
    if (profile) {
      setFormData({
        majors: profile.majors || '',
        minors: profile.minors || '',
        houseMembership: profile.house_membership || '',
        race: profile.race || '',
        pronouns: profile.pronouns || '',
        livingType: profile.living_type || '',
        gender: profile.gender || '',
        sexualOrientation: profile.sexual_orientation || '',
        expectedGraduation: profile.expected_graduation || '',
      });
    }
    setIsEditing(false);
  }, [profile]);

  const updateField = useCallback(<K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const saveProfile = useCallback(async () => {
    try {
      setSaving(true);

      const authResult = await checkAuthentication();
      if (!authResult.isAuthenticated) {
        handleAuthenticationRedirect();
        return;
      }

      // Map camelCase formData to snake_case database columns
      const updateData: any = {
        majors: formData.majors?.trim() || null,
        minors: formData.minors?.trim() || null,
        house_membership: formData.houseMembership?.trim() || null,
        living_type: formData.livingType?.trim() || null,
        race: formData.race?.trim() || null,
        pronouns: formData.pronouns?.trim() || null,
        gender: formData.gender?.trim() || null,
        sexual_orientation: formData.sexualOrientation?.trim() || null,
        expected_graduation: formData.expectedGraduation?.trim() || null,
        last_profile_update: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', authResult.user.id);

      if (updateError) {
        throw updateError;
      }

      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
      
      // Refresh data to get updated profile
      await fetchAccountData();
    } catch (err) {
      console.error('Error saving profile:', err);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [formData, fetchAccountData]);

  // ============================================================================
  // DATA CONSENT
  // ============================================================================
  const handleConsentAccept = useCallback(async (consentOptions: {
    demographics: boolean;
    academic: boolean;
    housing: boolean;
    analytics: boolean;
  }) => {
    try {
      // Save to secure storage
      await saveConsentPreferences(consentOptions);
      
      // Update local state
      setUserConsent(consentOptions);
      setConsentModalVisible(false);
      
      Alert.alert('Thank you!', 'Your data preferences have been saved.');
    } catch (err) {
      console.error('Error saving consent:', err);
      Alert.alert('Error', 'Failed to save preferences.');
    }
  }, []);

  const handleConsentDecline = useCallback(async () => {
    try {
      const allDeclined = {
        analytics: false,
        demographics: false,
        academic: false,
        housing: false,
      };
      
      // Save to secure storage
      await saveConsentPreferences(allDeclined);
      
      // Update local state
      setUserConsent(allDeclined);
      setConsentModalVisible(false);
      
      Alert.alert('Preferences Saved', 'Your data will not be used for analytics.');
    } catch (err) {
      console.error('Error saving consent:', err);
      Alert.alert('Error', 'Failed to save preferences.');
    }
  }, []);

  // ============================================================================
  // TEST BANK
  // ============================================================================
  const handleOpenTestBankModal = useCallback(() => {
    setTestBankModalVisible(true);
  }, []);

  const handleTestBankSubmit = useCallback(async () => {
    try {
      if (!testBankClassCode.trim()) {
        Alert.alert('Missing Information', 'Please enter a class code.');
        return;
      }

      if (!testBankSelectedFile) {
        Alert.alert('Missing File', 'Please select a file to upload.');
        return;
      }

      const authResult = await checkAuthentication();
      if (!authResult.isAuthenticated) {
        handleAuthenticationRedirect();
        return;
      }

      // Upload file to storage
      const result = await uploadFileToStorage(
        testBankSelectedFile.uri,
        'test-bank',
        'submissions',
        `${authResult.user.id}_${Date.now()}_${testBankSelectedFile.name}`,
        testBankSelectedFile.mimeType || 'application/pdf'
      );

      if (!result.success || !result.filePath) {
        throw new Error(result.error || 'File upload failed');
      }

      // Create test bank entry
      const { error: insertError } = await supabase
        .from('test_bank')
        .insert({
          submitted_by: authResult.user.id,
          class_code: testBankClassCode,
          file_type: testBankFileType,
          original_file_name: testBankSelectedFile.name,
          stored_file_name: result.filePath,
        });

      if (insertError) throw insertError;

      Alert.alert('Success', 'Test bank submission uploaded! It will be reviewed by officers.');
      
      // Reset form
      setTestBankClassCode('');
      setTestBankFileType('test');
      setTestBankSelectedFile(null);
      setTestBankModalVisible(false);

      // Refresh data
      await fetchAccountData();
    } catch (err) {
      console.error('Error submitting test bank:', err);
      Alert.alert('Error', 'Failed to upload submission. Please try again.');
    }
  }, [testBankClassCode, testBankFileType, testBankSelectedFile, fetchAccountData]);

  // ============================================================================
  // POINT APPEALS
  // ============================================================================
  const handleAppealPress = useCallback((event: Event) => {
    setSelectedAppealEvent(event);
    setAppealModalVisible(true);
  }, []);

  const handleSubmitAppeal = useCallback(async () => {
    try {
      if (!appealReason.trim()) {
        Alert.alert('Missing Information', 'Please provide a reason for your appeal.');
        return;
      }

      if (!selectedAppealEvent) return;

      setSubmittingAppeal(true);

      const authResult = await checkAuthentication();
      if (!authResult.isAuthenticated) {
        handleAuthenticationRedirect();
        return;
      }

      const { error: insertError } = await supabase
        .from('point_appeal')
        .insert({
          user_id: authResult.user.id,
          event_id: selectedAppealEvent.id,
          appeal_reason: appealReason.trim(),
          picture_url: appealPictureUrl || null,
          status: 'pending',
        });

      if (insertError) throw insertError;

      Alert.alert('Success', 'Your appeal has been submitted and will be reviewed by officers.');
      
      // Reset form
      setAppealReason('');
      setAppealPictureUrl('');
      setAppealModalVisible(false);
      setSelectedAppealEvent(null);

      // Refresh data
      await fetchAccountData();
    } catch (err) {
      console.error('Error submitting appeal:', err);
      Alert.alert('Error', 'Failed to submit appeal. Please try again.');
    } finally {
      setSubmittingAppeal(false);
    }
  }, [appealReason, appealPictureUrl, selectedAppealEvent, fetchAccountData]);

  // ============================================================================
  // EVENT FEEDBACK
  // ============================================================================
  const handleFeedbackPress = useCallback((event: Event) => {
    setSelectedFeedbackEvent(event);
    setFeedbackModalVisible(true);
  }, []);

  const handleUpdateFeedback = useCallback((field: string, value: any) => {
    setFeedbackData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmitFeedback = useCallback(async () => {
    try {
      if (!selectedFeedbackEvent) return;

      setSubmittingFeedback(true);

      const authResult = await checkAuthentication();
      if (!authResult.isAuthenticated) {
        handleAuthenticationRedirect();
        return;
      }

      const { error: insertError } = await supabase
        .from('event_feedback')
        .insert({
          user_id: authResult.user.id,
          event_id: selectedFeedbackEvent.id,
          rating: feedbackData.rating,
          comments: feedbackData.comments.trim(),
          would_attend_again: feedbackData.would_attend_again,
          well_organized: feedbackData.well_organized,
        });

      if (insertError) throw insertError;

      Alert.alert('Thank You!', 'Your feedback has been submitted.');
      
      // Reset form
      setFeedbackData({ 
        rating: 5, 
        would_attend_again: null, 
        well_organized: null, 
        comments: '' 
      });
      setFeedbackModalVisible(false);
      setSelectedFeedbackEvent(null);

      // Update submitted feedback set
      setSubmittedFeedback(prev => new Set(prev).add(selectedFeedbackEvent.id));
    } catch (err) {
      console.error('Error submitting feedback:', err);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  }, [feedbackData, selectedFeedbackEvent]);

  // ============================================================================
  // INITIAL DATA FETCH
  // ============================================================================
  useEffect(() => {
    fetchAccountData();
  }, [fetchAccountData]);

  // Load saved consent preferences
  useEffect(() => {
    const loadConsentPreferences = async () => {
      try {
        const { getConsentPreferences } = await import('../../../lib/dataConsent');
        const savedPreferences = await getConsentPreferences();
        
        if (savedPreferences) {
          setUserConsent({
            analytics: savedPreferences.analytics,
            demographics: savedPreferences.demographics,
            academic: savedPreferences.academic,
            housing: savedPreferences.housing,
          });
        }
      } catch (err) {
        console.error('Error loading consent preferences:', err);
      }
    };
    
    loadConsentPreferences();
  }, []);

  // ============================================================================
  // RETURN ALL STATE AND HANDLERS
  // ============================================================================
  return {
    // Data state
    loading,
    refreshing,
    error,
    profile,
    events,
    analytics,
    appeals,
    appealableEvents,
    submittedFeedback,
    testBankSubmissions,

    // Data actions
    fetchAccountData,
    handleRefresh,

    // Profile editing
    isEditing,
    formData,
    userConsent,
    canEdit,
    nextEditDate,
    daysUntilEdit,
    saving,
    startEditing,
    cancelEdit,
    updateField,
    saveProfile,

    // Modal visibility
    consentModalVisible,
    setConsentModalVisible,
    testBankModalVisible,
    setTestBankModalVisible,
    appealModalVisible,
    setAppealModalVisible,
    feedbackModalVisible,
    setFeedbackModalVisible,

    // Expanded sections
    eventsExpanded,
    setEventsExpanded,
    testBankExpanded,
    setTestBankExpanded,

    // Data consent
    handleConsentAccept,
    handleConsentDecline,

    // Test bank
    testBankClassCode,
    setTestBankClassCode,
    testBankFileType,
    setTestBankFileType,
    testBankSelectedFile,
    setTestBankSelectedFile,
    handleOpenTestBankModal,
    handleTestBankSubmit,

    // Point appeals
    selectedAppealEvent,
    appealReason,
    setAppealReason,
    appealPictureUrl,
    setAppealPictureUrl,
    submittingAppeal,
    handleAppealPress,
    handleSubmitAppeal,

    // Event feedback
    selectedFeedbackEvent,
    feedbackData,
    submittingFeedback,
    handleFeedbackPress,
    handleUpdateFeedback,
    handleSubmitFeedback,
  };
};
