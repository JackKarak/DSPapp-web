import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(error);
        Alert.alert('Error', 'Could not load event.');
      } else {
        setEvent(data);
      }

      setLoading(false);
    };

    const checkRegistration = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !id) return;

      const { data, error } = await supabase
        .from('event_registration')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', id)
        .maybeSingle();

      if (error) {
        console.error('Check registration error:', error.message);
      } else if (data) {
        setAlreadyRegistered(true);
      }
    };

    if (id) {
      fetchEvent();
      checkRegistration();
    }
  }, [id]);

  const handleRegister = async () => {
    setRegistering(true);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      Alert.alert('Auth Error', 'Please log in again.');
      setRegistering(false);
      return;
    }

    const { error } = await supabase.from('event_registration').insert({
      user_id: user.id,
      event_id: id,
    });

    if (error) {
      Alert.alert('Error', 'Registration failed.');
      console.error(error.message);
    } else {
      Alert.alert('Success', 'You are registered for this event!');
      setAlreadyRegistered(true);
    }

    setRegistering(false);
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 50 }} size="large" />;
  }

  if (!event) {
    return <Text style={styles.message}>Event not found</Text>;
  }

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>⬅ Back</Text>
      </TouchableOpacity>

      {/* Event Details */}
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.detail}>
        🗓 {new Date(event.start_time).toLocaleString()} —{' '}
        {new Date(event.end_time).toLocaleString()}
      </Text>
      <Text style={styles.detail}>📍 {event.location}</Text>
      <Text style={styles.detail}>🎯 Points: {event.point_type}</Text>
      <Text style={styles.description}>{event.description}</Text>

      {/* Register Button */}
      {alreadyRegistered ? (
        <Text style={styles.registered}>✅ You’re already registered.</Text>
      ) : (
        <Button title={registering ? 'Registering...' : 'Register'} onPress={handleRegister} disabled={registering} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  detail: { fontSize: 16, marginBottom: 6 },
  description: { fontSize: 16, marginVertical: 12, lineHeight: 22 },
  message: { padding: 20, fontSize: 18 },
  registered: {
    marginTop: 20,
    fontSize: 16,
    color: 'green',
    fontWeight: '600',
  },
  backButton: {
    marginBottom: 12,
    padding: 6,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
});

