import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../../constants/colors';
import { formatDateInEST, formatTimeInEST, getDateInEST } from '../../lib/dateUtils';
import { googleCalendarService } from '../../lib/googleCalendar';
import { supabase } from '../../lib/supabase';

interface RedFlag {
  type: 'error' | 'warning' | 'info';
  icon: string;
  message: string;
  details?: string;
}

interface PendingEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  point_type: string;
  point_value: number;
  created_by: string;
  creator_name: string;
  is_registerable: boolean;
  available_to_pledges: boolean;
  status: string;
  is_non_event?: boolean;
  code?: string;
  // Pre-computed fields
  redFlags?: RedFlag[];
  formattedStartDate?: string;
  formattedStartMonth?: string;
  formattedStartDay?: number;
  formattedStartWeekday?: string;
  formattedStartTime?: string;
  formattedEndTime?: string;
}

// State management with useReducer
interface ApprovalState {
  pendingEvents: PendingEvent[];
  allEvents: any[];
  loading: boolean;
  processingEventIds: Set<string>;
  expandedCards: Set<string>;
}

type ApprovalAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_EVENTS'; payload: { pending: PendingEvent[]; all: any[] } }
  | { type: 'TOGGLE_PROCESSING'; payload: string }
  | { type: 'TOGGLE_EXPANDED'; payload: string }
  | { type: 'CLEAR_PROCESSING'; payload: string };

function approvalReducer(state: ApprovalState, action: ApprovalAction): ApprovalState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_EVENTS':
      return {
        ...state,
        pendingEvents: action.payload.pending,
        allEvents: action.payload.all,
        loading: false,
      };
    
    case 'TOGGLE_PROCESSING': {
      const newSet = new Set(state.processingEventIds);
      if (newSet.has(action.payload)) {
        newSet.delete(action.payload);
      } else {
        newSet.add(action.payload);
      }
      return { ...state, processingEventIds: newSet };
    }
    
    case 'TOGGLE_EXPANDED': {
      const newSet = new Set(state.expandedCards);
      if (newSet.has(action.payload)) {
        newSet.delete(action.payload);
      } else {
        newSet.add(action.payload);
      }
      return { ...state, expandedCards: newSet };
    }
    
    case 'CLEAR_PROCESSING': {
      const newSet = new Set(state.processingEventIds);
      newSet.delete(action.payload);
      return { ...state, processingEventIds: newSet };
    }
    
    default:
      return state;
  }
}

// Pre-compute red flags for all events (runs once)
const precomputeEventData = (events: any[], allEvents: any[]): PendingEvent[] => {
  return events.map((event) => {
    const redFlags = detectRedFlags(event, allEvents);
    
    return {
      ...event,
      redFlags,
      formattedStartMonth: formatDateInEST(event.start_time, { month: 'short' }).toUpperCase(),
      formattedStartDay: getDateInEST(event.start_time).getDate(),
      formattedStartWeekday: formatDateInEST(event.start_time, { weekday: 'short' }),
      formattedStartTime: formatTimeInEST(event.start_time, { hour: '2-digit', minute: '2-digit' }),
      formattedEndTime: formatTimeInEST(event.end_time, { hour: '2-digit', minute: '2-digit' }),
    };
  });
};

// Red flag detection functions (moved above component)
const detectRedFlags = (event: PendingEvent, allEvents: PendingEvent[]): RedFlag[] => {
  const flags: RedFlag[] = [];

  // Missing information flags
  if (!event.description || event.description.trim() === '') {
    flags.push({
      type: 'warning',
      icon: '📝',
      message: 'Missing Description',
      details: 'Event lacks a detailed description for members'
    });
  }

  // Only check location for regular events, not non-events
  if (!event.is_non_event && (!event.location || event.location.trim() === '')) {
    flags.push({
      type: 'error',
      icon: '📍',
      message: 'Missing Location',
      details: 'Event must have a location specified'
    });
  }

  // Time-related flags (only for regular events, not non-events)
  const eventStart = new Date(event.start_time);
  const eventEnd = new Date(event.end_time);
  const now = new Date();

  if (!event.is_non_event) {
    if (eventStart >= eventEnd) {
      flags.push({
        type: 'error',
        icon: '⏰',
        message: 'Invalid Time Range',
        details: 'Event start time must be before end time'
      });
    }

    if (eventStart < now) {
      flags.push({
        type: 'error',
        icon: '📅',
        message: 'Past Event',
        details: 'Event is scheduled in the past'
      });
    }

    // Check for overlapping events (only for regular events)
    const overlappingEvents = allEvents.filter(otherEvent => {
      if (otherEvent.id === event.id || otherEvent.is_non_event) return false;
      
      const otherStart = new Date(otherEvent.start_time);
      const otherEnd = new Date(otherEvent.end_time);
      
      return (eventStart < otherEnd && eventEnd > otherStart);
    });

    if (overlappingEvents.length > 0) {
      overlappingEvents.forEach(otherEvent => {
        const otherStart = new Date(otherEvent.start_time);
        flags.push({
          type: 'warning',
          icon: '⚠️',
          message: 'Time Conflict',
          details: `Overlaps with "${otherEvent.title}" (${otherStart.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })})`
        });
      });
    }
  }

  // Pledge-related flags
  if (event.available_to_pledges) {
    flags.push({
      type: 'info',
      icon: '👥',
      message: 'Available to Pledges',
      details: 'This event is open to pledge class participation'
    });
  }

  // Non-event flag
  if (event.is_non_event) {
    flags.push({
      type: 'info',
      icon: '📊',
      message: 'Non-Event',
      details: 'This is a points-only entry and will not appear in the calendar or event list'
    });
  }

  // Point-related flags
  if (event.point_value === 0 && event.point_type !== 'No Point') {
    flags.push({
      type: 'warning',
      icon: '🎯',
      message: 'Zero Points',
      details: 'Event has no point value but has a point type'
    });
  }

  // Registration flags (only for regular events)
  if (!event.is_non_event && event.is_registerable) {
    const registrationDeadline = new Date(eventStart);
    registrationDeadline.setHours(registrationDeadline.getHours() - 24);
    
    if (now > registrationDeadline) {
      flags.push({
        type: 'warning',
        icon: '📝',
        message: 'Late Registration',
        details: 'Less than 24 hours for member registration'
      });
    }
  }

  return flags;
};

export default function EventApproval() {
  const [state, dispatch] = useReducer(approvalReducer, {
    pendingEvents: [],
    allEvents: [],
    loading: true,
    processingEventIds: new Set<string>(),
    expandedCards: new Set<string>(),
  });
  
  const router = useRouter();
  const hasCheckedAccess = useRef(false);

  const fetchPendingEvents = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Parallel fetch for pending events and all events
      const [eventsResult, allEventsResult] = await Promise.all([
        supabase
          .from('events')
          .select(`
            id, 
            title, 
            description, 
            start_time, 
            end_time, 
            location, 
            point_type, 
            point_value, 
            created_by, 
            is_registerable, 
            available_to_pledges, 
            status,
            is_non_event,
            code,
            created_by_user:created_by(first_name, last_name)
          `)
          .eq('status', 'pending')
          .order('start_time', { ascending: true }),
        
        supabase
          .from('events')
          .select('id, title, start_time, end_time, status')
          .order('start_time', { ascending: true })
      ]);

      const { data: eventsData, error: eventsError } = eventsResult;
      const { data: allData, error: allError } = allEventsResult;

      if (eventsError) {
        console.error('Events Error:', eventsError);
        Alert.alert('Error', 'Failed to load pending events.');
        return;
      }

      if (allError) {
        console.error('Error fetching all events:', allError);
      }

      if (!eventsData || eventsData.length === 0) {
        dispatch({ 
          type: 'SET_EVENTS', 
          payload: { pending: [], all: [] } 
        });
        return;
      }

      // Fetch creator names for events that don't have creator info
      const createdByIds = [...new Set(eventsData
        .filter(e => !e.created_by_user)
        .map(e => e.created_by))];
      
      let usersMap: Record<string, string> = {};
      
      if (createdByIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('user_id, first_name, last_name')
          .in('user_id', createdByIds);

        if (usersError) {
          console.error('Users Error:', usersError);
        }

        usersMap = usersData?.reduce((acc, user) => {
          const fullName = user.first_name && user.last_name 
            ? `${user.first_name} ${user.last_name}` 
            : 'Unknown User';
          acc[user.user_id] = fullName;
          return acc;
        }, {} as Record<string, string>) || {};
      }

      const enrichedEvents = eventsData.map((event: any) => {
        let creatorName = 'Unknown User';
        if (event.created_by_user && Array.isArray(event.created_by_user) && event.created_by_user.length > 0) {
          const creator = event.created_by_user[0];
          creatorName = `${creator.first_name} ${creator.last_name}`;
        } else if (event.created_by_user && !Array.isArray(event.created_by_user)) {
          const creator = event.created_by_user as any;
          creatorName = `${creator.first_name} ${creator.last_name}`;
        } else if (usersMap[event.created_by]) {
          creatorName = usersMap[event.created_by];
        }

        return {
          ...event,
          creator_name: creatorName,
        };
      });

      // Pre-compute red flags and formatted dates
      const processedEvents = precomputeEventData(enrichedEvents, allData || []);

      dispatch({ 
        type: 'SET_EVENTS', 
        payload: { pending: processedEvents, all: allData || [] } 
      });
    } catch (error) {
      console.error('Error fetching pending events:', error);
      Alert.alert('Error', 'Failed to load pending events.');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const checkAccess = useCallback(async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      const { data: userData, error: profileError } = await supabase
        .from('users')
        .select('role, officer_position')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userData) {
        Alert.alert('Access Denied', 'Unable to verify permissions.');
        router.replace('/(tabs)');
        return;
      }

      // Only presidents/admins can confirm events
      if (userData.role !== 'admin' && userData.officer_position !== 'president') {
        Alert.alert('Access Denied', 'Only presidents can confirm events.');
        router.replace('/(tabs)');
        return;
      }

      fetchPendingEvents();
    } catch (error) {
      console.error('Access check failed:', error);
      Alert.alert('Error', 'Failed to verify access permissions.');
      router.replace('/(tabs)');
    }
  }, [router, fetchPendingEvents]);

  useEffect(() => {
    if (!hasCheckedAccess.current) {
      hasCheckedAccess.current = true;
      checkAccess();
    }
  }, [checkAccess]);

  // Generate a 5-letter random code (optimized)
  const generateRandomCode = useCallback((): string => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return Array.from({ length: 5 }, () => 
      letters.charAt(Math.floor(Math.random() * letters.length))
    ).join('');
  }, []);

  const confirmEvent = useCallback(async (eventId: string) => {
    try {
      dispatch({ type: 'TOGGLE_PROCESSING', payload: eventId });

      // Find the event details for Google Calendar
      const eventToApprove = state.pendingEvents.find((event) => event.id === eventId);
      if (!eventToApprove) {
        dispatch({ type: 'CLEAR_PROCESSING', payload: eventId });
        Alert.alert('Error', 'Event not found.');
        return;
      }

      // Generate a unique 5-letter check-in code for the event
      const checkInCode = generateRandomCode();

      const { error } = await supabase
        .from('events')
        .update({ 
          status: 'approved',
          code: checkInCode
        })
        .eq('id', eventId);

      if (error) {
        console.error('Confirmation Error:', error);
        dispatch({ type: 'CLEAR_PROCESSING', payload: eventId });
        Alert.alert('Error', 'Failed to confirm event.');
        return;
      }

      // Only add regular events to Google Calendar (not non-events like points awards)
      if (!eventToApprove.is_non_event) {
        try {
          await googleCalendarService.initialize();
          const calendarResult = await googleCalendarService.createCalendarEvent({
            title: eventToApprove.title,
            description: eventToApprove.description,
            location: eventToApprove.location,
            startTime: eventToApprove.start_time,
            endTime: eventToApprove.end_time,
            isAllDay: false
          });

          if (calendarResult.success) {
            console.log('✅ Event added to Google Calendar:', calendarResult.eventId);
          } else {
            console.warn('⚠️ Failed to add to Google Calendar:', calendarResult.error);
            // Don't show error to user as the event was still approved in database
          }
        } catch (calendarError) {
          console.error('Calendar integration error:', calendarError);
          // Continue with approval even if calendar fails
        }
      }

      Alert.alert(
        'Event Approved! 🎉', 
        `✅ Event confirmed successfully!\n\n🎫 Check-in Code: ${checkInCode}\n\n` + 
        (!eventToApprove.is_non_event ? 
          '📅 Event has been added to Google Calendar\n👥 Members can use the code above to check in' : 
          '👥 Members can use this code to check in to the event'
        )
      );
      fetchPendingEvents(); // Refresh the list
    } catch (error) {
      console.error('Error confirming event:', error);
      Alert.alert('Error', 'Failed to confirm event.');
    } finally {
      dispatch({ type: 'CLEAR_PROCESSING', payload: eventId });
    }
  }, [state.pendingEvents, generateRandomCode, fetchPendingEvents]);

  const rejectEvent = useCallback(async (eventId: string) => {
    try {
      dispatch({ type: 'TOGGLE_PROCESSING', payload: eventId });

      const { error } = await supabase
        .from('events')
        .update({ status: 'rejected' })
        .eq('id', eventId);

      if (error) {
        console.error('Rejection Error:', error);
        dispatch({ type: 'CLEAR_PROCESSING', payload: eventId });
        Alert.alert('Error', 'Failed to reject event.');
        return;
      }

      Alert.alert('Success', 'Event rejected.');
      fetchPendingEvents(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting event:', error);
      Alert.alert('Error', 'Failed to reject event.');
    } finally {
      dispatch({ type: 'CLEAR_PROCESSING', payload: eventId });
    }
  }, [fetchPendingEvents]);

  const toggleCardExpansion = useCallback((eventId: string) => {
    dispatch({ type: 'TOGGLE_EXPANDED', payload: eventId });
  }, []);

  // Destructure state for easier access (must be before using in renderEventCard)
  const { pendingEvents, allEvents, loading, processingEventIds, expandedCards } = state;

  const renderEventCard = useCallback(({ item }: { item: PendingEvent }) => {
    // Use pre-computed data instead of computing on each render
    const redFlags = item.redFlags || [];
    const hasErrors = redFlags.some(flag => flag.type === 'error');
    const hasWarnings = redFlags.some(flag => flag.type === 'warning');
    const isExpanded = expandedCards.has(item.id);
    const isProcessing = processingEventIds.has(item.id);

    return (
      <View style={styles.eventCard}>
        {/* Event Hero Section - Always Visible */}
        <TouchableOpacity 
          style={styles.heroSection}
          onPress={() => toggleCardExpansion(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.dateColumn}>
            <Text style={styles.dateMonth}>
              {item.formattedStartMonth}
            </Text>
            <Text style={styles.dateDay}>
              {item.formattedStartDay}
            </Text>
            <Text style={styles.dateWeekday}>
              {item.formattedStartWeekday}
            </Text>
          </View>
          
          <View style={styles.eventInfo}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
              <View style={styles.expandIcon}>
                <Text style={styles.expandIconText}>
                  {isExpanded ? '−' : '+'}
                </Text>
              </View>
            </View>
            
            <View style={styles.eventMeta}>
              {!item.is_non_event && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaIcon}>📍</Text>
                  <Text style={styles.metaText} numberOfLines={1}>
                    {item.location || 'Location TBD'}
                  </Text>
                </View>
              )}
              {item.is_non_event && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaIcon}>📊</Text>
                  <Text style={styles.metaText} numberOfLines={1}>
                    Points-only entry
                  </Text>
                </View>
              )}
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>⏰</Text>
                <Text style={styles.metaText}>
                  {item.formattedStartTime} - {item.formattedEndTime}
                </Text>
              </View>
              {redFlags.length > 0 && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaIcon}>
                    {hasErrors ? '🔴' : hasWarnings ? '🟡' : '🔵'}
                  </Text>
                  <Text style={styles.metaText}>
                    {redFlags.length} issue{redFlags.length !== 1 ? 's' : ''} detected
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Expandable Content */}
        {isExpanded && (
          <>
            {/* Event Details */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Event Details</Text>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>
                    {item.is_non_event ? 'Non-Event (Points Only)' : 'Regular Event'}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Points</Text>
                  <Text style={styles.detailValue}>
                    {item.point_value || 0} {item.point_type || 'points'}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Registration</Text>
                  <Text style={styles.detailValue}>
                    {item.is_registerable ? 'Required' : 'Not required'}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Pledges</Text>
                  <Text style={styles.detailValue}>
                    {item.available_to_pledges ? 'Allowed' : 'Brothers only'}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Creator</Text>
                  <Text style={styles.detailValue}>{item.creator_name}</Text>
                </View>
              </View>
              
              {item.description && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.descriptionText}>{item.description}</Text>
                </View>
              )}
            </View>

            {/* Quality Assurance Issues */}
            {redFlags.length > 0 && (
              <View style={styles.flagsSection}>
                <Text style={styles.redFlagsTitle}>
                  Quality Assurance Issues ({redFlags.length})
                </Text>
                {redFlags.map((flag, index) => (
                  <View key={index} style={[
                    styles.flagItem,
                    flag.type === 'error' && styles.flagError,
                    flag.type === 'warning' && styles.flagWarning,
                    flag.type === 'info' && styles.flagInfo
                  ]}>
                    <Text style={styles.flagIcon}>{flag.icon}</Text>
                    <View style={styles.flagContent}>
                      <Text style={[
                        styles.flagMessage,
                        flag.type === 'error' && styles.flagMessageError,
                        flag.type === 'warning' && styles.flagMessageWarning,
                        flag.type === 'info' && styles.flagMessageInfo
                      ]}>
                        {flag.message}
                      </Text>
                      {flag.details && (
                        <Text style={styles.flagDetails}>{flag.details}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={[styles.approveButton, isProcessing && styles.disabledButton]}
                onPress={() => confirmEvent(item.id)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.approveButtonText}>✓ Approve</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.denyButton, isProcessing && styles.disabledButton]}
                onPress={() => rejectEvent(item.id)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.denyButtonText}>✗ Deny</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  }, [expandedCards, processingEventIds, toggleCardExpansion, confirmEvent, rejectEvent]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#330066" />
        <Text style={styles.loadingText}>Loading pending events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Event Approval</Text>
        <Text style={styles.subtitle}>Review and approve pending events</Text>
      </View>

      {pendingEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>No Pending Events</Text>
          <Text style={styles.emptySubtitle}>All events have been reviewed</Text>
        </View>
      ) : (
        <FlatList
          data={pendingEvents}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          // Performance optimizations
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          initialNumToRender={5}
          updateCellsBatchingPeriod={50}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  listContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  heroSection: {
    flexDirection: 'row',
    padding: 20,
  },
  dateColumn: {
    width: 60,
    alignItems: 'center',
    marginRight: 16,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  dateDay: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: 32,
  },
  dateWeekday: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  eventInfo: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
    lineHeight: 24,
  },
  expandIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  expandIconText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  eventMeta: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
  },
  metaText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    flex: 1,
  },
  detailsSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  detailItem: {
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  descriptionContainer: {
    marginTop: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginTop: 8,
  },
  flagsSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fefefe',
  },
  redFlagsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 12,
  },
  flagItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  flagError: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  flagWarning: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  flagInfo: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  flagIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
  },
  flagContent: {
    flex: 1,
  },
  flagMessage: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  flagMessageError: {
    color: '#dc2626',
  },
  flagMessageWarning: {
    color: '#d97706',
  },
  flagMessageInfo: {
    color: '#2563eb',
  },
  flagDetails: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  actionSection: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fafafa',
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  approveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  denyButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  denyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
