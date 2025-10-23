/**
 * useAccountData Hook
 * 
 * Manages ALL data fetching, state, and logic for the account screen
 * This hook contains all business logic, keeping the component file minimal
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../../../../lib/supabase';
import { uploadFileToStorage } from '../../../../lib/fileUpload';
import { 
  shouldShowConsentModal, 
  saveConsentPreferences,
  getConsentPreferences,
  filterDataByConsent,
  ConsentPreferences 
} from '../../../../lib/dataConsent';

export function useAccountData() {
  // ==================== STATE ====================
  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data state
  const [profile, setProfile] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [appealableEvents, setAppealableEvents] = useState<any[]>([]);
  const [submittedFeedback, setSubmittedFeedback] = useState<Set<string>>(new Set());
  const [testBankSubmissions, setTestBankSubmissions] = useState<any[]>([]);
  const [userConsent, setUserConsent] = useState<ConsentPreferences | null>(null);

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);
  const [testBankExpanded, setTestBankExpanded] = useState(false);
  
  // Modal states
  const [consentModalVisible, setConsentModalVisible] = useState(false);
  const [testBankModalVisible, setTestBankModalVisible] = useState(false);
  const [appealModalVisible, setAppealModalVisible] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  
  // Modal data states
  const [selectedAppealEvent, setSelectedAppealEvent] = useState<any>(null);
  const [selectedFeedbackEvent, setSelectedFeedbackEvent] = useState<any>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealPictureUrl, setAppealPictureUrl] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [testBankClassCode, setTestBankClassCode] = useState('');
  const [testBankFileType, setTestBankFileType] = useState<'test' | 'notes' | 'materials'>('test');
  const [testBankSelectedFile, setTestBankSelectedFile] = useState<any>(null);
  const [uploadingTestBank, setUploadingTestBank] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    rating: 0,
    would_attend_again: null as boolean | null,
    well_organized: null as boolean | null,
    comments: '',
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // ==================== DATA FETCHING ====================
  const fetchAccountData = useCallback(async () => {
    try {
      setError(null);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('Not authenticated');
        return;
      }

      const { data: dashboardData, error: dashboardError } = await supabase
        .rpc('get_account_dashboard', { p_user_id: user.id });

      if (dashboardError) {
        setError(dashboardError.message);
        return;
      }

      if (!dashboardData) {
        setError('No data returned');
        return;
      }

      setProfile(dashboardData.profile || null);
      setAnalytics(dashboardData.analytics || null);
      setEvents(dashboardData.events || []);
      setAppeals(dashboardData.user_appeals || []);
      setAppealableEvents(dashboardData.appealable_events || []);

      // Fetch submitted feedback
      const eventIds = (dashboardData.events || []).map((e: any) => e.id).filter(Boolean);
      if (eventIds.length > 0) {
        const { data: feedbackData } = await supabase
          .from('event_feedback')
          .select('event_id')
          .eq('user_id', user.id)
          .in('event_id', eventIds);
        
        if (feedbackData) {
          setSubmittedFeedback(new Set(feedbackData.map(f => f.event_id)));
        }
      }

      // Fetch test bank submissions
      const { data: testBankData } = await supabase
        .from('test_bank')
        .select('id, class_code, file_type, original_file_name, uploaded_at, status')
        .eq('submitted_by', user.id)
        .order('uploaded_at', { ascending: false });
      
      if (testBankData) {
        setTestBankSubmissions(testBankData);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ==================== PROFILE EDITING ====================
  const startEditing = useCallback(async () => {
    const needsConsent = await shouldShowConsentModal();
    
    if (needsConsent) {
      setConsentModalVisible(true);
      return;
    }

    const majorsArray: string[] = profile?.majors ? profile.majors.split(',').map((m: string) => m.trim()) : [];
    
    setFormData({
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      email: profile?.email || '',
      phoneNumber: profile?.phone_number || '',
      uid: profile?.uid || '',
      selectedMajors: majorsArray,
      minors: profile?.minors || '',
      expectedGraduation: profile?.expected_graduation || '',
      houseMembership: profile?.house_membership || '',
      pronouns: profile?.pronouns || '',
      gender: profile?.gender || '',
      sexualOrientation: profile?.sexual_orientation || '',
      race: profile?.race || '',
      livingType: profile?.living_type || '',
      pledgeClass: profile?.pledge_class || '',
    });
    setIsEditing(true);
  }, [profile]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setFormData({});
  }, []);

  const saveProfile = useCallback(async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
        Alert.alert('Error', 'First name and last name are required');
        setSaving(false);
        return;
      }

      const dbData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone_number: formData.phoneNumber,
        uid: formData.uid,
        majors: formData.selectedMajors?.join(', ') || '',
        minors: formData.minors,
        expected_graduation: formData.expectedGraduation,
        house_membership: formData.houseMembership,
        pronouns: formData.pronouns,
        gender: formData.gender,
        sexual_orientation: formData.sexualOrientation,
        race: formData.race,
        living_type: formData.livingType,
        pledge_class: formData.pledgeClass,
      };

      const filteredData = await filterDataByConsent(dbData);

      const { error } = await supabase
        .from('users')
        .update({
          ...filteredData,
          last_profile_update: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
      fetchAccountData();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [formData, fetchAccountData]);

  const updateField = useCallback((field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  }, []);

  // ==================== CONSENT MANAGEMENT ====================
  const handleConsentAccept = useCallback(async (consentOptions: { demographics: boolean; academic: boolean; housing: boolean; analytics: boolean }) => {
    try {
      const consent: ConsentPreferences = {
        ...consentOptions,
        timestamp: Date.now(),
        version: '1.0.0',
      };
      
      await saveConsentPreferences(consent);
      setUserConsent(consent);
      setConsentModalVisible(false);
      
      const majorsArray: string[] = profile?.majors ? profile.majors.split(',').map((m: string) => m.trim()) : [];
      
      setFormData({
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        email: profile?.email || '',
        phoneNumber: profile?.phone_number || '',
        uid: profile?.uid || '',
        selectedMajors: majorsArray,
        minors: profile?.minors || '',
        expectedGraduation: profile?.expected_graduation || '',
        houseMembership: profile?.house_membership || '',
        pronouns: profile?.pronouns || '',
        gender: profile?.gender || '',
        sexualOrientation: profile?.sexual_orientation || '',
        race: profile?.race || '',
        livingType: profile?.living_type || '',
        pledgeClass: profile?.pledge_class || '',
      });
      setIsEditing(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to save consent preferences');
    }
  }, [profile]);

  const handleConsentDecline = useCallback(async () => {
    const declinedConsent: ConsentPreferences = {
      demographics: false,
      academic: false,
      housing: false,
      analytics: false,
      timestamp: Date.now(),
      version: '1.0.0',
    };
    
    try {
      await saveConsentPreferences(declinedConsent);
      setUserConsent(declinedConsent);
      setConsentModalVisible(false);
      
      setFormData({
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        email: profile?.email || '',
        phoneNumber: profile?.phone_number || '',
        uid: profile?.uid || '',
        pledgeClass: profile?.pledge_class || '',
      });
      setIsEditing(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences');
    }
  }, [profile]);

  // ==================== EVENT HANDLERS ====================
  const handleFeedbackPress = useCallback((event: any) => {
    setSelectedFeedbackEvent(event);
    setFeedbackModalVisible(true);
  }, []);

  const handleAppealPress = useCallback((event: any) => {
    setSelectedAppealEvent(event);
    setAppealModalVisible(true);
  }, []);

  const handleOpenTestBankModal = useCallback(() => {
    setTestBankModalVisible(true);
  }, []);

  const handleSubmitFeedback = useCallback(async () => {
    if (!selectedFeedbackEvent || feedbackData.rating === 0) {
      Alert.alert('Error', 'Please provide a rating');
      return;
    }

    setSubmittingFeedback(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('event_feedback')
        .insert({
          event_id: selectedFeedbackEvent.id,
          user_id: user.id,
          rating: feedbackData.rating,
          would_attend_again: feedbackData.would_attend_again,
          well_organized: feedbackData.well_organized,
          comments: feedbackData.comments,
        });

      if (error) throw error;

      Alert.alert('Success', 'Feedback submitted successfully');
      setFeedbackModalVisible(false);
      setFeedbackData({ rating: 0, would_attend_again: null, well_organized: null, comments: '' });
      fetchAccountData();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit');
    } finally {
      setSubmittingFeedback(false);
    }
  }, [selectedFeedbackEvent, feedbackData, fetchAccountData]);

  const handleUpdateFeedback = useCallback(<K extends keyof typeof feedbackData>(
    field: K,
    value: typeof feedbackData[K]
  ) => {
    setFeedbackData((prev) => ({ ...prev, [field]: value }));
  }, [feedbackData]);

  const handleSubmitAppeal = useCallback(async () => {
    if (!selectedAppealEvent || !appealReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your appeal');
      return;
    }

    setSubmittingAppeal(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('point_appeal')
        .insert({
          event_id: selectedAppealEvent.id,
          user_id: user.id,
          appeal_reason: appealReason,
          picture_url: appealPictureUrl,
          status: 'pending',
        });

      if (error) throw error;

      Alert.alert('Success', 'Appeal submitted successfully');
      setAppealModalVisible(false);
      setAppealReason('');
      setAppealPictureUrl('');
      fetchAccountData();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit');
    } finally {
      setSubmittingAppeal(false);
    }
  }, [selectedAppealEvent, appealReason, appealPictureUrl, fetchAccountData]);

  const handleTestBankSubmit = useCallback(async () => {
    if (!testBankClassCode.trim() || !testBankSelectedFile) {
      Alert.alert('Error', 'Please provide class code and select a file');
      return;
    }

    setUploadingTestBank(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileUrl = await uploadFileToStorage(
        testBankSelectedFile.uri,
        testBankSelectedFile.name,
        testBankSelectedFile.type || 'application/pdf',
        'test-bank',
        user.id
      );

      const { error } = await supabase
        .from('test_bank')
        .insert({
          class_code: testBankClassCode,
          file_type: testBankFileType,
          file_url: fileUrl,
          original_file_name: testBankSelectedFile.name,
          submitted_by: user.id,
          status: 'pending',
        });

      if (error) throw error;

      Alert.alert('Success', 'Test bank submission successful');
      setTestBankModalVisible(false);
      setTestBankClassCode('');
      setTestBankSelectedFile(null);
      fetchAccountData();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to upload');
    } finally {
      setUploadingTestBank(false);
    }
  }, [testBankClassCode, testBankFileType, testBankSelectedFile, fetchAccountData]);

  // ==================== UTILITY FUNCTIONS ====================
  const canEdit = useCallback(() => {
    if (!profile?.last_profile_update) return true;
    const daysSince = Math.floor(
      (Date.now() - new Date(profile.last_profile_update).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince >= 7;
  }, [profile]);

  const nextEditDate = useCallback(() => {
    if (!profile?.last_profile_update) return null;
    const next = new Date(profile.last_profile_update);
    next.setDate(next.getDate() + 7);
    return next;
  }, [profile]);

  const daysUntilEdit = useCallback(() => {
    if (!profile?.last_profile_update) return 0;
    const daysSince = Math.floor(
      (Date.now() - new Date(profile.last_profile_update).getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, 7 - daysSince);
  }, [profile]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAccountData();
  }, [fetchAccountData]);

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchAccountData();
  }, [fetchAccountData]);

  useEffect(() => {
    const loadConsentPreferences = async () => {
      const consent = await getConsentPreferences();
      setUserConsent(consent);
    };
    loadConsentPreferences();
  }, []);

  // ==================== RETURN ALL STATE & FUNCTIONS ====================
  return {
    // State
    loading,
    refreshing,
    saving,
    error,
    profile,
    analytics,
    events,
    appeals,
    appealableEvents,
    testBankSubmissions,
    submittedFeedback,
    userConsent,
    isEditing,
    formData,
    eventsExpanded,
    achievementsExpanded,
    testBankExpanded,
    consentModalVisible,
    testBankModalVisible,
    appealModalVisible,
    feedbackModalVisible,
    selectedAppealEvent,
    selectedFeedbackEvent,
    appealReason,
    appealPictureUrl,
    submittingAppeal,
    testBankClassCode,
    testBankFileType,
    testBankSelectedFile,
    uploadingTestBank,
    feedbackData,
    submittingFeedback,
    
    // Actions
    fetchAccountData,
    startEditing,
    cancelEdit,
    saveProfile,
    updateField,
    handleConsentAccept,
    handleConsentDecline,
    handleFeedbackPress,
    handleAppealPress,
    handleOpenTestBankModal,
    handleSubmitFeedback,
    handleUpdateFeedback,
    handleSubmitAppeal,
    handleTestBankSubmit,
    canEdit: canEdit(),
    nextEditDate: nextEditDate(),
    daysUntilEdit: daysUntilEdit(),
    handleRefresh,
    
    // Setters for modals
    setConsentModalVisible,
    setTestBankModalVisible,
    setAppealModalVisible,
    setFeedbackModalVisible,
    setEventsExpanded,
    setAchievementsExpanded,
    setTestBankExpanded,
    setAppealReason,
    setAppealPictureUrl,
    setTestBankClassCode,
    setTestBankFileType,
    setTestBankSelectedFile,
    setFeedbackData,
  };
}
