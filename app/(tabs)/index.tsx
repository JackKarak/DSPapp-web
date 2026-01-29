import React, { useReducer, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getDateInEST } from '../../lib/dateUtils';
import { scheduleUpcomingEventNotifications } from '../../lib/scheduleNotifications';

// Components
import { EventCard, EventCardData } from '../../components/EventCard';
import { EventFilters, FilterOption } from '../../components/EventFilters';
import { CalendarView } from '../../components/CalendarView';
import { FeedbackNotification } from '../../components/FeedbackNotification';

// State type - CONSOLIDATED into single object
type State = {
  events: EventCardData[];
  registeredEventIds: string[];
  brotherName: string;
  pendingFeedbacks: number;
  userRole: string;
  userId: string | null; // Cache user ID for registration mutations
  loading: boolean;
  calendarView: boolean;
  selectedType: string;
  filterRegisterable: string;
  filterPastEvents: string;
  error: string | null;
};

// Action types
type Action =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_DATA'; data: Partial<State> }
  | { type: 'SET_CALENDAR_VIEW'; calendarView: boolean }
  | { type: 'SET_FILTER_TYPE'; selectedType: string }
  | { type: 'SET_FILTER_REGISTERABLE'; filterRegisterable: string }
  | { type: 'SET_FILTER_PAST_EVENTS'; filterPastEvents: string }
  | { type: 'ADD_REGISTRATION'; eventId: string }
  | { type: 'REMOVE_REGISTRATION'; eventId: string }
  | { type: 'SET_ERROR'; error: string };

// Reducer - single state update point
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_DATA':
      return { ...state, ...action.data, loading: false, error: null };
    case 'SET_CALENDAR_VIEW':
      return { ...state, calendarView: action.calendarView };
    case 'SET_FILTER_TYPE':
      return { ...state, selectedType: action.selectedType };
    case 'SET_FILTER_REGISTERABLE':
      return { ...state, filterRegisterable: action.filterRegisterable };
    case 'SET_FILTER_PAST_EVENTS':
      return { ...state, filterPastEvents: action.filterPastEvents };
    case 'ADD_REGISTRATION':
      return {
        ...state,
        registeredEventIds: [...state.registeredEventIds, action.eventId],
      };
    case 'REMOVE_REGISTRATION':
      return {
        ...state,
        registeredEventIds: state.registeredEventIds.filter(id => id !== action.eventId),
      };
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false };
    default:
      return state;
  }
}

// Initial state
const initialState: State = {
  events: [],
  registeredEventIds: [],
  brotherName: 'Brother',
  pendingFeedbacks: 0,
  userRole: '',
  userId: null,
  loading: true,
  calendarView: false,
  selectedType: 'All',
  filterRegisterable: 'All',
  filterPastEvents: 'All',
  error: null,
};

export default function CalendarTab() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Set default filter for pledges when role loads
  React.useEffect(() => {
    if (state.userRole === 'pledge') {
      dispatch({ type: 'SET_FILTER_PAST_EVENTS', filterPastEvents: 'Upcoming' });
      dispatch({ type: 'SET_CALENDAR_VIEW', calendarView: false });
    }
  }, [state.userRole]);

  // FOCUS-AWARE DATA LOADING - refreshes on tab focus
  const fetchData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', loading: true });

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        // User not authenticated - redirect to login without showing alert
        router.replace('/(auth)/login');
        return;
      }

      // PARALLEL QUERY 1: Fetch user profile, events, registrations, feedback all at once
      const [profileResult, eventsResult, registrationsResult, feedbackResult] = await Promise.all([
        // Profile
        supabase
          .from('users')
          .select('first_name, last_name, role, officer_position, approved')
          .eq('user_id', user.id)
          .single(),
        
        // Events
        supabase
          .from('events')
          .select('id, title, start_time, end_time, location, point_value, point_type, created_by, is_registerable, available_to_pledges')
          .eq('is_non_event', false)
          .eq('status', 'approved')
          .order('start_time', { ascending: true }),
        
        // Registrations
        supabase
          .from('event_registration')
          .select('event_id')
          .eq('user_id', user.id),
        
        // Feedback count (conditional)
        (async () => {
          // Pre-fetch profile to check role
          const { data: profile } = await supabase
            .from('users')
            .select('role, officer_position, approved')
            .eq('user_id', user.id)
            .single();
          
          if (profile && ((profile.role === 'admin' || profile.officer_position === 'president') || 
              (profile.approved && profile.officer_position))) {
            return supabase
              .from('admin_feedback')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'pending');
          }
          return null;
        })()
      ]);

      const { data: profile, error: profileError } = profileResult;
      const { data: eventsData, error: eventsError } = eventsResult;
      const { data: registrations, error: registrationError } = registrationsResult;

      // Error handling
      if (profileError || !profile) {
        throw new Error('Unable to load profile. Please contact support.');
      }
      if (eventsError) {
        throw new Error(`Unable to load events: ${eventsError.message}`);
      }
      if (!eventsData) {
        throw new Error('No events data received');
      }

      // PARALLEL QUERY 2: Fetch event creators (only for unique created_by IDs)
      const createdByIds = [...new Set(eventsData.map((e: any) => e.created_by))];
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, first_name, last_name')
        .in('user_id', createdByIds);

      if (usersError) {
        console.error('Users fetch error:', usersError);
        // Continue with empty map - non-critical error
      }

      // Build users map with fallback to empty object
      const usersMap = usersData?.reduce((acc, user) => {
        const fullName = user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}` 
          : 'Unknown';
        acc[user.user_id] = fullName;
        return acc;
      }, {} as Record<string, string>) || {};

      // PRE-COMPUTE dates for all events (performance optimization) with null safety
      const enrichedEvents = (eventsData || []).map((event: any) => ({
        ...event,
        host_name: usersMap[event.created_by] || 'Unknown',
        is_registerable: event.is_registerable ?? true,
        available_to_pledges: event.available_to_pledges ?? true,
        startDate: getDateInEST(event.start_time),
        endDate: getDateInEST(event.end_time),
      }));

      // Handle feedback count
      let pendingFeedbacks = 0;
      if (feedbackResult) {
        const { count, error: feedbackError } = feedbackResult;
        if (!feedbackError && count !== null) {
          pendingFeedbacks = count;
        }
      }

      // SINGLE STATE UPDATE - all data loaded at once
      dispatch({
        type: 'SET_DATA',
        data: {
          events: enrichedEvents,
          registeredEventIds: registrations?.map((r: any) => r.event_id) || [],
          brotherName: profile.first_name 
            ? `Brother ${profile.first_name}` 
            : 'Brother',
          userRole: profile.role,
          userId: user.id, // Cache user ID for later mutations
          pendingFeedbacks,
        },
      });

      // Schedule notifications for upcoming events with points (async, don't block UI)
      scheduleUpcomingEventNotifications().catch(err => {
        console.error('Failed to schedule notifications:', err);
        // Silent failure - notifications are nice-to-have, not critical
      });
      
    } catch (error: any) {
      console.error('Error in fetchData:', error);
      dispatch({ type: 'SET_ERROR', error: error.message || 'Something went wrong. Please try again.' });
      Alert.alert('Error', error.message || 'Something went wrong. Please try again.');
    }
  }, []);

  // Use focus effect instead of useEffect - refreshes on tab focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // MEMOIZED FILTER OPTIONS - compute once, reuse
  const filterTypeOptions = useMemo(() => {
    const uniqueTypes = [...new Set(state.events.map(e => e.point_type))];
    return [
      { label: 'All Types', value: 'All' },
      ...uniqueTypes.map((type) => ({
        label: type === 'dei' ? 'DEI' : 
               type === 'h&w' ? 'H&W' : 
               type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(),
        value: type
      }))
    ];
  }, [state.events]);

  // MEMOIZED FILTERED EVENTS - only recalculates when dependencies change
  const filteredEvents = useMemo(() => {
    const now = new Date();
    
    return state.events.filter(e => {
      const eventDate = e.startDate;
      const endDate = e.endDate;
      const isUpcoming = eventDate > now;
      const isPast = endDate < now;
      
      // Pledge restrictions
      if (state.userRole === 'pledge') {
        if (isPast || !e.available_to_pledges) {
          return false;
        }
      }
      
      // Filter by point type
      if (state.selectedType !== 'All' && e.point_type !== state.selectedType) {
        return false;
      }
      
      // Filter by registerable status
      if (state.filterRegisterable === 'Registerable' && !e.is_registerable) {
        return false;
      }
      if (state.filterRegisterable === 'Non-Registerable' && e.is_registerable) {
        return false;
      }
      
      // Filter by past/upcoming status
      if (state.filterPastEvents === 'Upcoming' && !isUpcoming) {
        return false;
      }
      if (state.filterPastEvents === 'Past' && isUpcoming) {
        return false;
      }
      
      return true;
    }).sort((a, b) => {
      const dateA = a.startDate;
      const dateB = b.startDate;
      
      const aIsUpcoming = dateA > now;
      const bIsUpcoming = dateB > now;
      
      if (aIsUpcoming && !bIsUpcoming) return -1;
      if (!aIsUpcoming && bIsUpcoming) return 1;
      
      return dateA.getTime() - dateB.getTime();
    });
  }, [state.events, state.selectedType, state.filterRegisterable, state.filterPastEvents, state.userRole]);

  // OPTIMIZED REGISTRATION - no duplicate getUser() calls
  const handleRegister = useCallback(async (eventId: string) => {
    if (!state.userId) {
      Alert.alert('Authentication Error', 'Please log in again.');
      return;
    }

    try {
      const { error } = await supabase.from('event_registration').insert({
        user_id: state.userId,
        event_id: eventId,
      });

      if (error) {
        Alert.alert('Registration Failed', error.message);
      } else {
        dispatch({ type: 'ADD_REGISTRATION', eventId });
        Alert.alert('Success', 'You have been registered for this event!');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to register. Please try again.');
    }
  }, [state.userId]);

  const handleUnregister = useCallback(async (eventId: string) => {
    if (!state.userId) {
      Alert.alert('Authentication Error', 'Please log in again.');
      return;
    }

    try {
      const { error } = await supabase
        .from('event_registration')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', state.userId);

      if (error) {
        Alert.alert('Unregistration Failed', error.message);
      } else {
        dispatch({ type: 'REMOVE_REGISTRATION', eventId });
        Alert.alert('Success', 'You have been unregistered from this event.');
      }
    } catch (error) {
      console.error('Unregistration error:', error);
      Alert.alert('Error', 'Failed to unregister. Please try again.');
    }
  }, [state.userId]);

  // Error UI
  if (state.error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error Loading Events</Text>
          <Text style={styles.errorSubtext}>{state.error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={true}
    >
      <Text style={styles.header} numberOfLines={1} adjustsFontSizeToFit={true}>
        Welcome, {state.brotherName}
      </Text>

      {/* Feedback Notifications for Presidents/Admins */}
      <FeedbackNotification
        pendingCount={state.pendingFeedbacks}
        userRole={state.userRole}
      />

      {/* Hide calendar toggle for pledges */}
      {state.userRole !== 'pledge' && (
        <TouchableOpacity 
          onPress={() => dispatch({ type: 'SET_CALENDAR_VIEW', calendarView: !state.calendarView })} 
          style={styles.toggleBtn}
        >
          <Text style={styles.toggleText}>
            {state.calendarView ? 'Switch to List View' : 'Switch to Calendar View'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Calendar View */}
      {state.calendarView && state.userRole !== 'pledge' && <CalendarView />}

      {/* Event Filters */}
      {!state.calendarView && (
        <EventFilters
          selectedType={state.selectedType}
          filterRegisterable={state.filterRegisterable}
          filterPastEvents={state.filterPastEvents}
          typeOptions={filterTypeOptions}
          userRole={state.userRole}
          onTypeChange={(value) => dispatch({ type: 'SET_FILTER_TYPE', selectedType: value })}
          onRegisterableChange={(value) => dispatch({ type: 'SET_FILTER_REGISTERABLE', filterRegisterable: value })}
          onPastEventsChange={(value) => dispatch({ type: 'SET_FILTER_PAST_EVENTS', filterPastEvents: value })}
        />
      )}

      {state.loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#330066" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      ) : filteredEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No events available</Text>
          <Text style={styles.emptySubtext}>Check back later for upcoming events</Text>
        </View>
      ) : (
        <View style={styles.eventsContainer}>
          {filteredEvents.map(item => (
            <EventCard
              key={item.id}
              event={item}
              isRegistered={state.registeredEventIds.includes(item.id)}
              onRegister={handleRegister}
              onUnregister={handleUnregister}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f3f7',
    padding: 16
  },
  header: {
    fontSize: 30,
    fontWeight: '800',
    color: '#330066',
    marginBottom: 20,
    marginTop: 8,
    textShadowColor: 'rgba(51, 0, 102, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  toggleBtn: {
    backgroundColor: '#330066',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#330066',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#F7B910',
  },
  toggleText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#330066',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#d8d0e0',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#330066',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6b5b7a',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#330066',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  eventsContainer: {
    gap: 16,
  },
});
