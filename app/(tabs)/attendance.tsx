import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { EventFeedbackModal } from '../../components/AccountModals/EventFeedbackModal';

// EST timezone helpers
const formatDateTimeInEST = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const getCurrentTimeInEST = () => {
  const now = new Date();
  return now.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

type CheckInState = 'idle' | 'validating' | 'submitting' | 'success';

interface FeedbackEvent {
  id: string;
  title: string;
  date: string;
  host_name: string;
}

export default function AttendanceScreen() {
  const [code, setCode] = useState('');
  const [state, setState] = useState<CheckInState>('idle');
  const [userRole, setUserRole] = useState<string | null>(null);

  // Check user role on mount
  React.useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setUserRole(data.role);
      }
    }
    checkRole();
  }, []);

  // Block access for alumni and abroad
  if (userRole === 'alumni' || userRole === 'abroad') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Access Restricted</Text>
        <Text style={[styles.loadingText, { textAlign: 'center' }]}>
          Alumni and abroad members cannot record attendance.
        </Text>
      </View>
    );
  }
  
  // Feedback modal state
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [selectedFeedbackEvent, setSelectedFeedbackEvent] = useState<FeedbackEvent | null>(null);
  const [feedbackData, setFeedbackData] = useState({
    rating: 5,
    would_attend_again: null as boolean | null,
    well_organized: null as boolean | null,
    comments: '',
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!code.trim()) {
      Alert.alert('⚠️ Missing Code', 'Please enter an attendance code.');
      return;
    }

    setState('validating');

    try {
      // PARALLEL QUERY #1: Get user auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('User not authenticated.');
      }

      // PARALLEL QUERY #2: Get event AND user profile at the same time
      const [eventResult, profileResult] = await Promise.all([
        supabase
          .from('events')
          .select('id, title, start_time, end_time, code') // Only select needed columns
          .eq('code', code.trim().toUpperCase())
          .maybeSingle(), // Better than checking array length
        supabase
          .from('users')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .single()
      ]);

      // Check event result
      if (eventResult.error) {
        throw new Error('Unable to verify code. Please try again.');
      }

      if (!eventResult.data) {
        Alert.alert('❌ Invalid Code', 'This attendance code is not valid or has expired.');
        setState('idle');
        return;
      }

      const event = eventResult.data;

      // Validate event timing
      const currentTime = new Date();
      const eventStartTime = new Date(event.start_time);
      const eventEndTime = new Date(event.end_time);

      if (currentTime < eventStartTime) {
        Alert.alert(
          '⏰ Event Not Started',
          `You cannot check in before the event starts.\n\nEvent Start: ${formatDateTimeInEST(event.start_time)}\nCurrent Time (EST): ${getCurrentTimeInEST()}`
        );
        setState('idle');
        return;
      }

      if (currentTime > eventEndTime) {
        Alert.alert(
          '⏰ Event Has Ended',
          `You cannot check in after the event has ended.\n\nEvent End: ${formatDateTimeInEST(event.end_time)}\nCurrent Time (EST): ${getCurrentTimeInEST()}`
        );
        setState('idle');
        return;
      }

      // ATOMIC CHECK-IN: Use database constraint to prevent duplicates
      setState('submitting');

      const { error: insertError } = await supabase
        .from('event_attendance')
        .insert({
          event_id: event.id,
          user_id: user.id,
          scanned_by: user.id,
          attended_at: new Date().toISOString(),
        });

      if (insertError) {
        // Check if it's a duplicate key error (already checked in)
        if (insertError.code === '23505') {
          Alert.alert('ℹ️ Already Checked In', 'You\'ve already been marked present for this event.');
          setState('idle');
          setCode('');
          return;
        }
        
        throw new Error(`Failed to record attendance: ${insertError.message}`);
      }

      // Success! Use pre-fetched profile data
      setState('success');
      const userName = profileResult.data?.first_name && profileResult.data?.last_name
        ? `${profileResult.data.first_name} ${profileResult.data.last_name}`
        : 'User';
      
      Alert.alert('✅ Success', `${userName}, you have been marked present for "${event.title}".`);
      setCode('');
      setState('idle');
      
      // Show feedback modal
      setSelectedFeedbackEvent({
        id: event.id,
        title: event.title,
        date: event.start_time,
        host_name: 'Event Host'
      });
      setFeedbackModalVisible(true);

    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert(
        '❌ Error',
        error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      );
      setState('idle');
    }
  }, [code]);

  const handleUpdateFeedback = useCallback((field: string, value: any) => {
    setFeedbackData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmitFeedback = useCallback(async () => {
    try {
      if (!selectedFeedbackEvent) return;

      setSubmittingFeedback(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert('Error', 'Authentication required.');
        return;
      }

      const { error: insertError } = await supabase
        .from('event_feedback')
        .insert({
          user_id: user.id,
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
    } catch (err) {
      console.error('Error submitting feedback:', err);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  }, [feedbackData, selectedFeedbackEvent]);

  const isLoading = state === 'validating' || state === 'submitting';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Text style={styles.title}>Attendance Check-In</Text>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#330066" />
          <Text style={styles.loadingText}>
            {state === 'validating' ? 'Validating code...' : 'Submitting check-in...'}
          </Text>
        </View>
      )}

      <TextInput
        placeholder="Enter attendance code"
        value={code}
        onChangeText={setCode}
        style={styles.input}
        placeholderTextColor="#9980b3"
        autoCapitalize="characters"
        editable={!isLoading}
      />

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Processing...' : 'Submit'}
        </Text>
      </TouchableOpacity>

      {/* Event Feedback Modal */}
      <EventFeedbackModal
        visible={feedbackModalVisible}
        event={selectedFeedbackEvent}
        onClose={() => {
          setFeedbackModalVisible(false);
          setSelectedFeedbackEvent(null);
          setFeedbackData({ 
            rating: 5, 
            would_attend_again: null, 
            well_organized: null, 
            comments: '' 
          });
        }}
        onSubmit={handleSubmitFeedback}
        feedbackData={feedbackData}
        onUpdateFeedback={handleUpdateFeedback}
        submitting={submittingFeedback}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f3f7',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    color: '#330066',
    fontWeight: '800',
    marginBottom: 32,
    textAlign: 'center',
    textShadowColor: 'rgba(51, 0, 102, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#330066',
    shadowColor: '#330066',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#330066',
    fontWeight: '600',
  },
  input: {
    borderWidth: 2,
    borderColor: '#330066',
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 12,
    fontSize: 18,
    marginBottom: 24,
    color: '#330066',
    fontWeight: '600',
    textAlign: 'center',
    shadowColor: '#330066',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    borderRadius: 12,
    backgroundColor: '#330066',
    paddingVertical: 16,
    shadowColor: '#330066',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
