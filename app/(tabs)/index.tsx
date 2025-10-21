import React, { useReducer, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Modal,
  FlatList
} from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getDateInEST, formatDateInEST } from '../../lib/dateUtils';

// Type definitions
type Event = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  point_value: number;
  point_type: string;
  created_by: string;
  host_name: string;
  is_registerable: boolean;
  available_to_pledges: boolean;
  startDate: Date; // Pre-computed
  endDate: Date;   // Pre-computed
};

// State type - CONSOLIDATED into single object
type State = {
  events: Event[];
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

// Utility functions for tag styling
function getTypeTagStyle(type: string) {
  const styles: Record<string, any> = {
    service: { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
    social: { backgroundColor: '#fce7f3', borderColor: '#ec4899' },
    dei: { backgroundColor: '#e0e7ff', borderColor: '#6366f1' },
    professional: { backgroundColor: '#d1fae5', borderColor: '#10b981' },
    'h&w': { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
  };
  return styles[type] || { backgroundColor: '#f3f4f6', borderColor: '#9ca3af' };
}

function getTypeTagTextStyle(type: string) {
  const styles: Record<string, any> = {
    service: { color: '#1e40af' },
    social: { color: '#9f1239' },
    dei: { color: '#4338ca' },
    professional: { color: '#047857' },
    'h&w': { color: '#b45309' },
  };
  return styles[type] || { color: '#374151' };
}

// CustomDropdown component (same as before)
const CustomDropdown = ({
  label,
  value,
  options,
  onValueChange
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onValueChange: (value: string) => void;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.filterLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsOpen(true)}
      >
        <Text style={styles.dropdownButtonText} numberOfLines={1}>
          {options.find(opt => opt.value === value)?.label || value}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              style={styles.optionsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    item.value === value && styles.selectedOption
                  ]}
                  onPress={() => {
                    onValueChange(item.value);
                    setIsOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value && styles.selectedOptionText
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
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
        Alert.alert('Authentication Error', 'Please log in again.');
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
      }

      // Build users map
      const usersMap = usersData?.reduce((acc, user) => {
        const fullName = user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}` 
          : 'Unknown';
        acc[user.user_id] = fullName;
        return acc;
      }, {} as Record<string, string>) || {};

      // PRE-COMPUTE dates for all events (performance optimization)
      const enrichedEvents = eventsData.map((event: any) => ({
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
          brotherName: profile.first_name && profile.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : 'Brother',
          userRole: profile.role,
          userId: user.id, // Cache user ID for later mutations
          pendingFeedbacks,
        },
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
          <Text style={styles.errorText}>⚠️ Error Loading Events</Text>
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
      {((state.userRole === 'admin') || (state.userRole === 'officer')) && (
        <TouchableOpacity 
          style={[styles.feedbackNotification, state.pendingFeedbacks > 0 && styles.feedbackNotificationActive]}
          onPress={() => router.push('/president/presidentindex' as any)}
        >
          <View style={styles.feedbackContent}>
            <Text style={styles.feedbackIcon}>💬</Text>
            <View style={styles.feedbackTextContainer}>
              <Text style={styles.feedbackTitle}>Member Feedback</Text>
              <Text style={styles.feedbackCount}>
                {state.pendingFeedbacks > 0 
                  ? `${state.pendingFeedbacks} pending message${state.pendingFeedbacks > 1 ? 's' : ''}` 
                  : 'No pending messages'}
              </Text>
            </View>
            {state.pendingFeedbacks > 0 && (
              <View style={styles.feedbackBadge}>
                <Text style={styles.feedbackBadgeText}>{state.pendingFeedbacks}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}

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

      {/* Hide calendar view for pledges */}
      {state.calendarView && state.userRole !== 'pledge' && (
        <View style={styles.calendarContainer}>
          <WebView
            style={styles.calendar}
            source={{
              uri: 'https://calendar.google.com/calendar/embed?src=2fcabe745ddb6168899f921984a988938842026359b78e7588d129e64e84dde6%40group.calendar.google.com&ctz=America%2FNew_York'
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#8b5cf6" />
              </View>
            )}
          />
        </View>
      )}

      {!state.calendarView && (
        <View style={styles.filterBar}>
          <Text style={styles.filterBarTitle}>Filters</Text>
          
          <View style={styles.filterRow}>
            <CustomDropdown
              label="Type"
              value={state.selectedType}
              options={filterTypeOptions}
              onValueChange={(value) => dispatch({ type: 'SET_FILTER_TYPE', selectedType: value })}
            />

            <CustomDropdown
              label="Registration"
              value={state.filterRegisterable}
              options={[
                { label: 'All Events', value: 'All' },
                { label: 'Registerable', value: 'Registerable' },
                { label: 'Non-Registerable', value: 'Non-Registerable' }
              ]}
              onValueChange={(value) => dispatch({ type: 'SET_FILTER_REGISTERABLE', filterRegisterable: value })}
            />

            <CustomDropdown
              label="Status"
              value={state.filterPastEvents}
              options={state.userRole === 'pledge' ? [
                { label: 'Upcoming', value: 'Upcoming' }
              ] : [
                { label: 'All Events', value: 'All' },
                { label: 'Upcoming', value: 'Upcoming' },
                { label: 'Past Events', value: 'Past' }
              ]}
              onValueChange={(value) => dispatch({ type: 'SET_FILTER_PAST_EVENTS', filterPastEvents: value })}
            />
          </View>
        </View>
      )}

      {state.loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      ) : filteredEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No events available</Text>
          <Text style={styles.emptySubtext}>Check back later for upcoming events</Text>
        </View>
      ) : (
        <View style={styles.eventsContainer}>
          {filteredEvents.map(item => {
            const isRegistered = state.registeredEventIds.includes(item.id);
            const eventDate = item.startDate;
            const isUpcoming = eventDate > new Date();
            
            return (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.eventCard, !isUpcoming && styles.pastEventCard]}
                onPress={() => router.push({
                  pathname: `/event/[id]` as const,
                  params: { 
                    id: item.id,
                    is_registerable: item.is_registerable ? '1' : '0'
                  }
                })}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.dateContainer}>
                    <Text style={styles.dateDay}>
                      {eventDate.getDate()}
                    </Text>
                    <Text style={styles.dateMonth}>
                      {formatDateInEST(item.start_time, { month: 'short' }).toUpperCase()}
                    </Text>
                  </View>
                  
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.eventTime}>
                      {formatDateInEST(item.start_time, { 
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </Text>
                    <Text style={styles.eventLocation} numberOfLines={1}>
                      📍 {item.location}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.cardDetails}>
                  <View style={styles.tagContainer}>
                    <View style={[styles.typeTag, getTypeTagStyle(item.point_type)]}>
                      <Text style={[styles.typeTagText, getTypeTagTextStyle(item.point_type)]}>
                        {item.point_type === 'dei' ? 'DEI' : 
                         item.point_type === 'h&w' ? 'H&W' : 
                         item.point_type.toUpperCase()}
                      </Text>
                    </View>
                    {!isUpcoming && (
                      <View style={styles.pastTag}>
                        <Text style={styles.pastTagText}>PAST</Text>
                      </View>
                    )}
                    {isRegistered && (
                      <View style={styles.registeredTag}>
                        <Text style={styles.registeredTagText}>✓ REGISTERED</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.hostText}>
                    Hosted by {item.host_name}
                  </Text>
                </View>
                
                {item.is_registerable && isUpcoming && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        isRegistered ? styles.unregisterButton : styles.registerButton
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        isRegistered ? handleUnregister(item.id) : handleRegister(item.id);
                      }}
                    >
                      <Text style={[
                        styles.actionButtonText,
                        isRegistered ? styles.unregisterButtonText : styles.registerButtonText
                      ]}>
                        {isRegistered ? 'Unregister' : 'Register Now'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa',
    padding: 16 
  },
  header: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#1a1a1a', 
    marginBottom: 20,
    marginTop: 8
  },
  toggleBtn: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  toggleText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 16
  },
  filterBar: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  filterBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 10,
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  // Custom Dropdown Styles
  dropdownContainer: {
    flex: 1,
    minWidth: 0,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    textAlign: 'center',
  },
  dropdownButton: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 40,
  },
  dropdownButtonText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
    textAlign: 'left',
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#6b7280',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  selectedOption: {
    backgroundColor: '#f0f9ff',
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  selectedOptionText: {
    color: '#0369a1',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: '#0369a1',
    fontWeight: '700',
  },
  calendarContainer: {
    height: Dimensions.get('window').height * 0.6,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  calendar: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
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
    color: '#6b7280',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#9ca3af',
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
    backgroundColor: '#8b5cf6',
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
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  pastEventCard: {
    opacity: 0.7,
    backgroundColor: '#f8fafc',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dateContainer: {
    backgroundColor: '#d97706',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    marginRight: 16,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 28,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fef3c7',
    letterSpacing: 0.5,
  },
  eventInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
    lineHeight: 24,
  },
  eventTime: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  cardDetails: {
    marginBottom: 16,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  typeTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeTagText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  pastTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  pastTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  registeredTag: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#16a34a',
  },
  registeredTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
    letterSpacing: 0.5,
  },
  hostText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  cardActions: {
    marginTop: 4,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  registerButton: {
    backgroundColor: '#8b5cf6',
  },
  unregisterButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  registerButtonText: {
    color: '#fff',
  },
  unregisterButtonText: {
    color: '#ef4444',
  },
  // Feedback notification styles
  feedbackNotification: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackNotificationActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  feedbackContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  feedbackTextContainer: {
    flex: 1,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  feedbackCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  feedbackBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  feedbackBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
