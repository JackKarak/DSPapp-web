import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { formatDateTimeInEST } from '../../lib/dateUtils';
import { EventDetail } from '../../types/account';
import { getPointTypeColors, formatPointTypeText } from '../../lib/pointTypeColors';

// Type for component state
type EventState = {
  event: EventDetail | null;
  isRegistered: boolean;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
};

export default function EventDetailScreen() {
  const { id, is_registerable } = useLocalSearchParams<{ id: string; is_registerable: string }>();
  const router = useRouter();
  
  const [state, setState] = useState<EventState>({
    event: null,
    isRegistered: false,
    loading: true,
    error: null,
    refreshing: false,
  });
  const [registering, setRegistering] = useState(false);

  // Memoize registerable status
  const isRegisterable = useMemo(() => is_registerable === '1', [is_registerable]);

  // Fetch event data and registration status in parallel
  const fetchEventData = useCallback(async (isRefresh = false) => {
    if (!id) {
      setState(prev => ({ ...prev, loading: false, error: 'No event ID provided' }));
      return;
    }

    try {
      if (isRefresh) {
        setState(prev => ({ ...prev, refreshing: true, error: null }));
      } else {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      // Get user info once and reuse
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      // Parallel fetch: event, profile, and registration status
      const [eventResult, profileResult, registrationResult] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single(),
        supabase
          .from('users')
          .select('role')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('event_registration')
          .select('id')
          .eq('user_id', user.id)
          .eq('event_id', id)
          .maybeSingle()
      ]);

      // Handle errors
      if (eventResult.error) {
        throw new Error(eventResult.error.message || 'Could not load event');
      }
      
      if (profileResult.error) {
        throw new Error(profileResult.error.message || 'Unable to load your profile');
      }

      const eventData = eventResult.data;
      const userRole = profileResult.data.role;

      // Check pledge restrictions
      if (userRole === 'pledge') {
        const eventEndDate = new Date(eventData.end_time);
        const isPastEvent = eventEndDate < new Date();

        if (isPastEvent) {
          Alert.alert(
            'Access Restricted', 
            'Pledges cannot access past events.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }

        if (!eventData.available_to_pledges) {
          Alert.alert(
            'Access Restricted', 
            'This event is not available to pledges.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }
      }

      setState({
        event: eventData,
        isRegistered: !!registrationResult.data,
        loading: false,
        error: null,
        refreshing: false,
      });

    } catch (error: any) {
      console.error('Event fetch error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: error.message || 'An unexpected error occurred',
      }));
    }
  }, [id, router]);

  // Initial load
  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  // Handle pull to refresh
  const onRefresh = useCallback(() => {
    fetchEventData(true);
  }, [fetchEventData]);

  // Handle registration with optimistic updates
  const handleRegister = useCallback(async () => {
    if (!id) return;

    setRegistering(true);
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (!user || authError) {
        Alert.alert('Auth Error', 'Please log in again.');
        return;
      }

      const { error } = await supabase.from('event_registration').insert({
        user_id: user.id,
        event_id: id,
      });

      if (error) {
        throw new Error(error.message);
      }

      setState(prev => ({ ...prev, isRegistered: true }));
      Alert.alert('Success', 'You are registered for this event!');

    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.message || 'Registration failed. Please try again.');
    } finally {
      setRegistering(false);
    }
  }, [id]);

  // Loading state
  if (state.loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#330066" />
          <Text style={styles.loadingText}>Loading event details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state with retry
  if (state.error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.messageContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorMessage}>{state.error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchEventData()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Event not found
  if (!state.event) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.messageContainer}>
          <Text style={styles.errorIcon}>🔍</Text>
          <Text style={styles.message}>Event not found</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
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
        refreshControl={
          <RefreshControl 
            refreshing={state.refreshing}
            onRefresh={onRefresh}
            tintColor="#330066"
            colors={['#330066']}
          />
        }
        bounces={true}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{state.event.title}</Text>
        
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.icon}>🗓</Text>
            <Text style={styles.detail}>
              {formatDateTimeInEST(state.event.start_time)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.icon}>⏱</Text>
            <Text style={styles.detail}>
              {formatDateTimeInEST(state.event.end_time)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.icon}>📍</Text>
            <Text style={styles.detail}>{state.event.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.icon}>🎯</Text>
            <View style={[
              styles.pointTypeTag,
              {
                backgroundColor: getPointTypeColors(state.event.point_type).backgroundColor,
                borderColor: getPointTypeColors(state.event.point_type).borderColor,
              }
            ]}>
              <Text style={[
                styles.pointTypeText,
                { color: getPointTypeColors(state.event.point_type).textColor }
              ]}>
                {formatPointTypeText(state.event.point_type)}
              </Text>
            </View>
            <Text style={styles.pointValue}>({state.event.point_value} pts)</Text>
          </View>
        </View>

        {state.event.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>Description</Text>
            <Text style={styles.description}>{state.event.description}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {isRegisterable ? (
          state.isRegistered ? (
            <View style={styles.registeredContainer}>
              <Text style={styles.registered}>✅ You&apos;re registered for this event</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.registerButton, registering && styles.registeringButton]}
              onPress={handleRegister}
              disabled={registering}
              activeOpacity={0.8}
            >
              <Text style={styles.registerButtonText}>
                {registering ? 'Registering...' : 'Register for Event'}
              </Text>
            </TouchableOpacity>
          )
        ) : (
          <View style={styles.notAvailableContainer}>
            <Text style={styles.notAvailable}>⚠️ Registration not available for this event</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
  },
  retryButton: {
    backgroundColor: '#330066',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonText: {
    fontSize: 17,
    color: '#0038A8',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#330066',
    marginBottom: 20,
    lineHeight: 34,
  },
  detailsContainer: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
  },
  detail: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    lineHeight: 22,
  },
  pointTypeTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    marginRight: 8,
  },
  pointTypeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pointValue: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  descriptionContainer: {
    marginTop: 4,
  },
  descriptionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    color: '#330066',
  },
  description: {
    fontSize: 16,
    lineHeight: 26,
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
  registeredContainer: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  registered: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
  },
  notAvailableContainer: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  notAvailable: {
    fontSize: 16,
    color: '#E65100',
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#0038A8',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#0038A8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  registeringButton: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
