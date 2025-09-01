import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function EventDetail() {
  const { id, is_registerable } = useLocalSearchParams<{ id: string; is_registerable: string }>();
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
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#330066" />
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.messageContainer}>
          <Text style={styles.message}>Event not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        bounces={true}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.title}>{event.title}</Text>
        
        <View style={styles.detailsContainer}>
          <Text style={styles.detail}>
            <Text style={styles.icon}>🗓 </Text>
            {new Date(event.start_time).toLocaleString()}
          </Text>
          <Text style={styles.detail}>
            <Text style={styles.icon}>⏱ </Text>
            {new Date(event.end_time).toLocaleString()}
          </Text>
          <Text style={styles.detail}>
            <Text style={styles.icon}>📍 </Text>
            {event.location}
          </Text>
          <Text style={styles.detail}>
            <Text style={styles.icon}>🎯 </Text>
            Points: {event.point_type}
          </Text>
        </View>

        {event.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>Description</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {is_registerable === '1' ? (
          alreadyRegistered ? (
            <View style={styles.registeredContainer}>
              <Text style={styles.registered}>✅ You&apos;re registered for this event</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.registerButton, registering && styles.registeringButton]}
              onPress={handleRegister}
              disabled={registering}
            >
              <Text style={styles.registerButtonText}>
                {registering ? 'Registering...' : 'Register for Event'}
              </Text>
            </TouchableOpacity>
          )
        ) : (
          <View style={styles.registeredContainer}>
            <Text style={styles.registered}>⚠️ Registration not available for this event</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
)}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#330066',
    marginBottom: 16,
  },
  detailsContainer: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  detail: {
    fontSize: 16,
    marginBottom: 12,
    color: '#333',
  },
  icon: {
    marginRight: 8,
  },
  descriptionContainer: {
    marginTop: 8,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#330066',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonText: {
    fontSize: 17,
    color: '#0038A8',
    fontWeight: '600',
  },
  registeredContainer: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  registered: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#0038A8',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  registeringButton: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    padding: 20,
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
  },
});

