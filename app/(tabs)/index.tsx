import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors } from '../../constants/colors';
import { formatDateInEST, getDateInEST } from '../../lib/dateUtils';
import { supabase } from '../../lib/supabase';

// Custom Dropdown Component
interface DropdownProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onValueChange: (value: string) => void;
}

const CustomDropdown: React.FC<DropdownProps> = ({ label, value, options, onValueChange }) => {
  const [isVisible, setIsVisible] = useState(false);

  const selectedOption = options.find(option => option.value === value);

  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.filterLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.dropdownButtonText} numberOfLines={1}>
          {selectedOption?.label || 'Select...'}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView style={styles.optionsList}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    option.value === value && styles.selectedOption
                  ]}
                  onPress={() => {
                    onValueChange(option.value);
                    setIsVisible(false);
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    option.value === value && styles.selectedOptionText
                  ]}>
                    {option.label}
                  </Text>
                  {option.value === value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// Move style functions outside component to prevent recreation on every render
const getTypeTagStyle = (type: string) => {
  const colors = {
    brotherhood: { backgroundColor: '#f3e8ff' },
    service: { backgroundColor: '#fffbeb' },
    scholarship: { backgroundColor: '#fffbeb' },
    professional: { backgroundColor: '#f3e8ff' },
    professionalism: { backgroundColor: '#f3e8ff' },
    dei: { backgroundColor: '#f9f1ff' },
    fundraising: { backgroundColor: '#fffbeb' },
    health: { backgroundColor: '#fffbeb' },
    'h&w': { backgroundColor: '#fffbeb' },
  };
  return colors[type.toLowerCase() as keyof typeof colors] || { backgroundColor: '#F5F5F5' };
};

const getTypeTagTextStyle = (type: string) => {
  const colors = {
    brotherhood: { color: Colors.primary },
    service: { color: Colors.secondary },
    scholarship: { color: Colors.secondary },
    professional: { color: Colors.primary },
    professionalism: { color: Colors.primary },
    dei: { color: Colors.primary },
    fundraising: { color: Colors.secondary },
    health: { color: Colors.secondary },
    'h&w': { color: Colors.secondary },
  };
  return colors[type.toLowerCase() as keyof typeof colors] || { color: '#666' };
};

type Event = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  point_value: number;
  point_type: string;
  created_by: string;
  host_name?: string;
  is_registerable: boolean;
  available_to_pledges: boolean;
  startDate?: Date; // Pre-computed date
  endDate?: Date; // Pre-computed date
};

export default function CalendarTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [registeredEventIds, setRegisteredEventIds] = useState<string[]>([]);
  const [brotherName, setBrotherName] = useState<string | null>(null);
  const [pendingFeedbacks, setPendingFeedbacks] = useState<number>(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarView, setCalendarView] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('All');
  const [filterRegisterable, setFilterRegisterable] = useState<string>('All');
  const [filterPastEvents, setFilterPastEvents] = useState<string>('All');
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  // Set default filter for pledges to only show upcoming events
  useEffect(() => {
    if (userRole === 'pledge') {
      setFilterPastEvents('Upcoming');
      setCalendarView(false); // Ensure calendar view is disabled for pledges
    }
  }, [userRole]);

  const fetchData = async () => {
    setLoading(true);

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

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('first_name, last_name, role, officer_position, approved')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        Alert.alert('Profile Error', 'Unable to load your profile. Please contact support.');
        setLoading(false);
        return;
      }

      const fullName = profile.first_name && profile.last_name 
        ? `${profile.first_name} ${profile.last_name}` 
        : 'Brother';
      setBrotherName(fullName);
      setUserRole(profile.role);

      // Parallelize: fetch events, registrations, and optionally feedback count
      const eventsPromise = supabase
        .from('events')
        .select('id, title, start_time, end_time, location, point_value, point_type, created_by, is_registerable, available_to_pledges')
        .eq('is_non_event', false)
        .eq('status', 'approved')
        .order('start_time', { ascending: true });

      const registrationsPromise = supabase
        .from('event_registration')
        .select('event_id')
        .eq('user_id', user.id);

      // Add feedback count query if user is admin/officer
      let feedbackPromise = null;
      if ((profile.role === 'admin' || profile.officer_position === 'president') || 
          (profile.approved && profile.officer_position)) {
        feedbackPromise = supabase
          .from('admin_feedback')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
      }

      // Execute all queries in parallel
      const [eventsResult, registrationsResult, feedbackResult] = await Promise.all([
        eventsPromise,
        registrationsPromise,
        feedbackPromise
      ]);

      const { data: eventsData, error: eventsError } = eventsResult;
      const { data: registrations, error: registrationError } = registrationsResult;

      if (eventsError) {
        console.error('Events Error:', eventsError);
        Alert.alert('Events Error', `Unable to load events: ${eventsError.message}`);
        setLoading(false);
        return;
      }

      if (!eventsData) {
        Alert.alert('Events Error', 'No events data received');
        setLoading(false);
        return;
      }

      // Handle feedback count if query was executed
      if (feedbackResult) {
        const { count, error: feedbackError } = feedbackResult;
        if (!feedbackError && count !== null) {
          setPendingFeedbacks(count);
        }
      }

      // Fetch event creators info
      const createdByIds = [...new Set(eventsData.map((e: any) => e.created_by))];
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, first_name, last_name')
        .in('user_id', createdByIds);

      if (usersError) {
        console.error('Users fetch error:', usersError);
        // Continue with empty map if user data fails to load
      }

      const usersMap = usersData?.reduce((acc, user) => {
        const fullName = user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}` 
          : 'Unknown';
        acc[user.user_id] = fullName;
        return acc;
      }, {} as Record<string, string>) || {};

      const enrichedEvents = eventsData.map((event: any) => ({
        ...event,
        host_name: usersMap[event.created_by] || 'Unknown',
        is_registerable: event.is_registerable ?? true, // default to true for backward compatibility
        available_to_pledges: event.available_to_pledges ?? true, // default to true for backward compatibility
        startDate: getDateInEST(event.start_time), // Pre-compute date
        endDate: getDateInEST(event.end_time), // Pre-compute date
      }));

      setEvents(enrichedEvents);

      if (registrationError) {
        console.error('Registration fetch error:', registrationError);
        // Continue with empty registration list if fetch fails
      }

      setRegisteredEventIds(registrations?.map((r: any) => r.event_id) || []);
      
    } catch (error) {
      console.error('Error in fetchData:', error);
      Alert.alert('Unexpected Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Memoize filtered events to prevent recalculation on every render
  const filteredEvents = useMemo(() => {
    const now = new Date();
    
    return events.filter(e => {
      // Use pre-computed dates for better performance
      const eventDate = e.startDate || getDateInEST(e.start_time);
      const endDate = e.endDate || getDateInEST(e.end_time);
      const isUpcoming = eventDate > now;
      const isPast = endDate < now;
      
      // Pledge restrictions
      if (userRole === 'pledge') {
        // Pledges cannot access past events
        if (isPast) {
          return false;
        }
        
        // Pledges cannot access events where available_to_pledges is false
        if (!e.available_to_pledges) {
          return false;
        }
      }
      
      // Filter by point type
      if (selectedType !== 'All' && e.point_type !== selectedType) {
        return false;
      }
      
      // Filter by registerable status
      if (filterRegisterable === 'Registerable' && !e.is_registerable) {
        return false;
      }
      if (filterRegisterable === 'Non-Registerable' && e.is_registerable) {
        return false;
      }
      
      // Filter by past/upcoming status
      if (filterPastEvents === 'Upcoming' && !isUpcoming) {
        return false;
      }
      if (filterPastEvents === 'Past' && isUpcoming) {
        return false;
      }
      
      return true;
    }).sort((a, b) => {
      // Sort by date, with upcoming events first
      // Use pre-computed dates for better performance
      const dateA = a.startDate || getDateInEST(a.start_time);
      const dateB = b.startDate || getDateInEST(b.start_time);
      
      const aIsUpcoming = dateA > now;
      const bIsUpcoming = dateB > now;
      
      // If one is upcoming and other is past, upcoming comes first
      if (aIsUpcoming && !bIsUpcoming) return -1;
      if (!aIsUpcoming && bIsUpcoming) return 1;
      
      // If both are upcoming or both are past, sort by date
      return dateA.getTime() - dateB.getTime();
    });
  }, [events, selectedType, filterRegisterable, filterPastEvents, userRole]);

  const handleRegister = useCallback(async (eventId: string) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Authentication Error', 'Please log in again.');
        return;
      }

      const { error } = await supabase.from('event_registration').insert({
        user_id: user.id,
        event_id: eventId,
      });

      if (error) {
        Alert.alert('Registration Failed', error.message);
      } else {
        setRegisteredEventIds((prev) => [...prev, eventId]);
        Alert.alert('Success', 'You have been registered for this event!');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to register. Please try again.');
    }
  }, []);

  const handleUnregister = useCallback(async (eventId: string) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Authentication Error', 'Please log in again.');
        return;
      }

      const { error } = await supabase
        .from('event_registration')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id);

      if (error) {
        Alert.alert('Unregistration Failed', error.message);
      } else {
        setRegisteredEventIds((prev) => prev.filter((id) => id !== eventId));
        Alert.alert('Success', 'You have been unregistered from this event.');
      }
    } catch (error) {
      console.error('Unregistration error:', error);
      Alert.alert('Error', 'Failed to unregister. Please try again.');
    }
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={true}
    >
      <Text style={styles.header} numberOfLines={1} adjustsFontSizeToFit={true}>
        Welcome, {brotherName || 'Brother'}
      </Text>

      {/* Feedback Notifications for Presidents/Admins */}
      {((userRole === 'admin') || (userRole === 'officer')) && (
        <TouchableOpacity 
          style={[styles.feedbackNotification, pendingFeedbacks > 0 && styles.feedbackNotificationActive]}
          onPress={() => router.push('/president/presidentindex' as any)}
        >
          <View style={styles.feedbackContent}>
            <Text style={styles.feedbackIcon}>💬</Text>
            <View style={styles.feedbackTextContainer}>
              <Text style={styles.feedbackTitle}>Member Feedback</Text>
              <Text style={styles.feedbackCount}>
                {pendingFeedbacks > 0 
                  ? `${pendingFeedbacks} pending message${pendingFeedbacks > 1 ? 's' : ''}` 
                  : 'No pending messages'}
              </Text>
            </View>
            {pendingFeedbacks > 0 && (
              <View style={styles.feedbackBadge}>
                <Text style={styles.feedbackBadgeText}>{pendingFeedbacks}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* Hide calendar toggle for pledges */}
      {userRole !== 'pledge' && (
        <TouchableOpacity onPress={() => setCalendarView(!calendarView)} style={styles.toggleBtn}>
          <Text style={styles.toggleText}>
            {calendarView ? 'Switch to List View' : 'Switch to Calendar View'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Hide calendar view for pledges */}
      {calendarView && userRole !== 'pledge' && (
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

      {!calendarView && (
        <View style={styles.filterBar}>
          <Text style={styles.filterBarTitle}>Filters</Text>
          
          <View style={styles.filterRow}>
            <CustomDropdown
              label="Type"
              value={selectedType}
              options={[
                { label: 'All Types', value: 'All' },
                ...[...new Set(events.map(e => e.point_type))].map((type) => ({
                  label: type === 'dei' ? 'DEI' : 
                         type === 'h&w' ? 'H&W' : 
                         type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(),
                  value: type
                }))
              ]}
              onValueChange={(value) => setSelectedType(value)}
            />

            <CustomDropdown
              label="Registration"
              value={filterRegisterable}
              options={[
                { label: 'All Events', value: 'All' },
                { label: 'Registerable', value: 'Registerable' },
                { label: 'Non-Registerable', value: 'Non-Registerable' }
              ]}
              onValueChange={(value) => setFilterRegisterable(value)}
            />

            <CustomDropdown
              label="Status"
              value={filterPastEvents}
              options={userRole === 'pledge' ? [
                { label: 'Upcoming', value: 'Upcoming' }
              ] : [
                { label: 'All Events', value: 'All' },
                { label: 'Upcoming', value: 'Upcoming' },
                { label: 'Past Events', value: 'Past' }
              ]}
              onValueChange={(value) => setFilterPastEvents(value)}
            />
          </View>
        </View>
      )}

      {loading ? (
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
            const isRegistered = registeredEventIds.includes(item.id);
            // Use pre-computed date for better performance
            const eventDate = item.startDate || getDateInEST(item.start_time);
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
