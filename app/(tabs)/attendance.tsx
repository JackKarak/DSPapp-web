import React, { useState } from 'react';
import {
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

export default function AttendanceScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!code.trim()) {
      Alert.alert('⚠️ Missing Code', 'Please enter an attendance code.');
      return;
    }

    setLoading(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setLoading(false);
      Alert.alert('❌ Error', 'User not authenticated.');
      return;
    }

    // Check if the code is valid for an approved event
    const { data: events, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('code', code.trim())
      .eq('status', 'approved');

    if (eventError || !events || events.length === 0) {
      setLoading(false);
      Alert.alert('❌ Error', 'Invalid or expired code.');
      return;
    }

    const event = events[0];

    // Check if user already recorded attendance
    const { data: existing, error: checkError } = await supabase
      .from('event_attendance')
      .select('id')
      .eq('event_id', event.id)
      .eq('user_id', user.id);

    if (checkError) {
      setLoading(false);
      Alert.alert('❌ Error', checkError.message);
      return;
    }

    if (existing.length > 0) {
      setLoading(false);
      Alert.alert('ℹ️ Already Checked In', 'You’ve already been marked present for this event.');
      return;
    }

    const { error: insertError } = await supabase
      .from('event_attendance')
      .insert([
        {
          event_id: event.id,
          user_id: user.id,
          scanned_by: user.id, // optional: record who scanned if you want
          attended_at: new Date().toISOString(),
        },
      ]);

    setLoading(false);

    if (insertError) {
      Alert.alert('❌ Error', insertError.message);
    } else {
      Alert.alert('✅ Success', `You have been marked present for "${event.title}".`);
      setCode('');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Text style={styles.title}>📲 Attendance Check-In</Text>

      <TextInput
        placeholder="Enter attendance code"
        value={code}
        onChangeText={setCode}
        style={styles.input}
        placeholderTextColor="#aaa"
        autoCapitalize="none"
      />

      <View style={styles.button}>
        <Button
          title={loading ? 'Checking...' : 'Submit'}
          onPress={handleSubmit}
          color="#6C4AB6"
          disabled={loading}
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

