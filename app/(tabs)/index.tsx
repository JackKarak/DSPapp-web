import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '../../lib/supabase';

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
};

export default function CalendarTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [registeredEventIds, setRegisteredEventIds] = useState<string[]>([]);
  const [brotherName, setBrotherName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarView, setCalendarView] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('All');
  const [filterRegisterable, setFilterRegisterable] = useState<string>('All');
  const [filterPastEvents, setFilterPastEvents] = useState<string>('All');
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      Alert.alert('Error', 'Unable to load user session.');
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('first_name, last_name, approved')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.approved) {
      Alert.alert('Pending Approval', 'Your account has not been approved yet.');
      setLoading(false);
      return;
    }

    const fullName = profile.first_name && profile.last_name 
      ? `${profile.first_name} ${profile.last_name}` 
      : 'Brother';
    setBrotherName(fullName);

    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('id, title, start_time, end_time, location, point_value, point_type, created_by, is_registerable')
      .eq('status', 'approved')
      .order('start_time', { ascending: true });

    if (eventsError) {
      Alert.alert('Error', eventsError.message);
      setLoading(false);
      return;
    }

    const createdByIds = [...new Set(eventsData.map(e => e.created_by))];
    const { data: usersData } = await supabase
      .from('users')
      .select('user_id, first_name, last_name')
      .in('user_id', createdByIds);

    const usersMap = usersData?.reduce((acc, user) => {
      const fullName = user.first_name && user.last_name 
        ? `${user.first_name} ${user.last_name}` 
        : 'Unknown';
      acc[user.user_id] = fullName;
      return acc;
    }, {} as Record<string, string>) || {};

    const enrichedEvents = eventsData.map(event => ({
      ...event,
      host_name: usersMap[event.created_by] || 'Unknown',
      is_registerable: event.is_registerable ?? true, // default to true for backward compatibility
    }));

    setEvents(enrichedEvents);

    const { data: registrations } = await supabase
      .from('event_registration')
      .select('event_id')
      .eq('user_id', user.id);

    setRegisteredEventIds(registrations?.map((r) => r.event_id) || []);
    setLoading(false);
  };

  const filteredEvents = events.filter(e => {
    const eventDate = new Date(e.start_time);
    const isUpcoming = eventDate > new Date();
    
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
    const dateA = new Date(a.start_time);
    const dateB = new Date(b.start_time);
    const now = new Date();
    
    const aIsUpcoming = dateA > now;
    const bIsUpcoming = dateB > now;
    
    // If one is upcoming and other is past, upcoming comes first
    if (aIsUpcoming && !bIsUpcoming) return -1;
    if (!aIsUpcoming && bIsUpcoming) return 1;
    
    // If both are upcoming or both are past, sort by date
    return dateA.getTime() - dateB.getTime();
  });

  const handleRegister = async (eventId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('event_registration').insert({
      user_id: user?.id,
      event_id: eventId,
    });

    if (error) {
      Alert.alert('Registration Failed', error.message);
    } else {
      setRegisteredEventIds((prev) => [...prev, eventId]);
    }
  };

  const handleUnregister = async (eventId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('event_registration')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user?.id);

    if (!error) {
      setRegisteredEventIds((prev) => prev.filter((id) => id !== eventId));
    }
  };

  // Helper functions for styling
  const getTypeTagStyle = (type: string) => {
    const colors = {
      brotherhood: { backgroundColor: '#f3e8ff' },
      service: { backgroundColor: '#fef3c7' },
      scholarship: { backgroundColor: '#fef3c7' },
      professionalism: { backgroundColor: '#f3e8ff' },
      dei: { backgroundColor: '#fce7f3' },
      fundraising: { backgroundColor: '#f0fdf4' },
      'h&w': { backgroundColor: '#fef3c7' },
    };
    return colors[type.toLowerCase() as keyof typeof colors] || { backgroundColor: '#F5F5F5' };
  };

  const getTypeTagTextStyle = (type: string) => {
    const colors = {
      brotherhood: { color: '#7c3aed' },
      service: { color: '#d97706' },
      scholarship: { color: '#d97706' },
      professionalism: { color: '#7c3aed' },
      dei: { color: '#be185d' },
      fundraising: { color: '#16a34a' },
      'h&w': { color: '#d97706' },
    };
    return colors[type.toLowerCase() as keyof typeof colors] || { color: '#666' };
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={true}
    >
      <Text style={styles.header}>Welcome, Brother {brotherName}</Text>

      <TouchableOpacity onPress={() => setCalendarView(!calendarView)} style={styles.toggleBtn}>
        <Text style={styles.toggleText}>
          {calendarView ? 'Switch to List View' : 'Switch to Calendar View'}
        </Text>
      </TouchableOpacity>

      {calendarView && (
        <View style={styles.calendarContainer}>
          <WebView
            style={styles.calendar}
            source={{
              uri: 'https://calendar.google.com/calendar/embed?src=dspumd%40gmail.com&ctz=America%2FNew_York'
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
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Type:</Text>
              <Picker
                selectedValue={selectedType}
                style={[styles.filterPicker, Platform.OS === 'ios' && { height: 120 }]}
                itemStyle={styles.pickerItem}
                onValueChange={(itemValue) => setSelectedType(itemValue)}
              >
                <Picker.Item label="All Types" value="All" />
                {[...new Set(events.map(e => e.point_type))].map((type) => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Registration:</Text>
              <Picker
                selectedValue={filterRegisterable}
                style={[styles.filterPicker, Platform.OS === 'ios' && { height: 120 }]}
                itemStyle={styles.pickerItem}
                onValueChange={(itemValue) => setFilterRegisterable(itemValue)}
              >
                <Picker.Item label="All Events" value="All" />
                <Picker.Item label="Registerable" value="Registerable" />
                <Picker.Item label="Non-Registerable" value="Non-Registerable" />
              </Picker>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status:</Text>
              <Picker
                selectedValue={filterPastEvents}
                style={[styles.filterPicker, Platform.OS === 'ios' && { height: 120 }]}
                itemStyle={styles.pickerItem}
                onValueChange={(itemValue) => setFilterPastEvents(itemValue)}
              >
                <Picker.Item label="All Events" value="All" />
                <Picker.Item label="Upcoming" value="Upcoming" />
                <Picker.Item label="Past Events" value="Past" />
              </Picker>
            </View>
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
            const eventDate = new Date(item.start_time);
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
                      {eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                    </Text>
                  </View>
                  
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.eventTime}>
                      {eventDate.toLocaleDateString('en-US', { 
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
                        {item.point_type.toUpperCase()}
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
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  filterBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  filterGroup: {
    flex: 1,
  },
  filterPicker: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 4,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  picker: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pickerItem: {
    fontSize: 16,
    color: '#374151',
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
});
