import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

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

export default function AttendanceScreen() {
  const [code, setCode] = useState('');
  const [state, setState] = useState<CheckInState>('idle');

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

    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert(
        '❌ Error',
        error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      );
      setState('idle');
    }
  }, [code]);

  const isLoading = state === 'validating' || state === 'submitting';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Text style={styles.title}>📲 Attendance Check-In</Text>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C4AB6" />
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
        placeholderTextColor="#aaa"
        autoCapitalize="characters"
        editable={!isLoading}
      />

      <View style={styles.button}>
        <Button
          title={isLoading ? 'Processing...' : 'Submit'}
          onPress={handleSubmit}
          color="#6C4AB6"
          disabled={isLoading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    color: '#6C4AB6',
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6C4AB6',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f8f6ff',
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    borderRadius: 10,
    overflow: 'hidden',
  },
});
