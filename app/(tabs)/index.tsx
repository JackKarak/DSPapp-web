import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
      .select('name, approved')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.approved) {
      Alert.alert('Pending Approval', 'Your account has not been approved yet.');
      setLoading(false);
      return;
    }

    setBrotherName(profile.name ?? 'Brother');

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
      .select('user_id, name')
      .in('user_id', createdByIds);

    const usersMap = usersData?.reduce((acc, user) => {
      acc[user.user_id] = user.name;
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

  const filteredEvents = events.filter(e => 
    selectedType === 'All' || e.point_type === selectedType
  );

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
                <ActivityIndicator size="large" color="#330066" />
              </View>
            )}
          />
          <Picker
            selectedValue={selectedType}
            style={styles.picker}
            onValueChange={(itemValue) => setSelectedType(itemValue)}
          >
            <Picker.Item label="All Types" value="All" />
            {[...new Set(events.map(e => e.point_type))].map((type) => (
              <Picker.Item key={type} label={type} value={type} />
            ))}
          </Picker>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        filteredEvents.map(item => {
          const isRegistered = registeredEventIds.includes(item.id);
          return (
            <View key={item.id} style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.details}>{new Date(item.start_time).toLocaleString()}</Text>
              <Text style={styles.details}>Location: {item.location}</Text>
              <Text style={styles.details}>Host: {item.host_name}</Text>
              <Text style={styles.details}>Point Type: {item.point_type}</Text>
              <View style={styles.actions}>
                {item.is_registerable && (
                  <TouchableOpacity
                    style={[styles.button, isRegistered ? styles.unregister : styles.register]}
                    onPress={() =>
                      isRegistered ? handleUnregister(item.id) : handleRegister(item.id)
                    }
                  >
                    <Text style={styles.buttonText}>{isRegistered ? 'Unregister' : 'Register'}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.button, styles.detailsBtn, !item.is_registerable && styles.fullWidth]}
                  onPress={() => router.push({
                    pathname: `/event/[id]` as const,
                    params: { 
                      id: item.id,
                      is_registerable: item.is_registerable ? '1' : '0'
                    }
                  })}
                >
                  <Text style={styles.buttonText}>Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16 
  },
  fullWidth: {
    flex: 1,
  },
  header: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#330066', 
    marginBottom: 12 
  },
  toggleBtn: {
    backgroundColor: '#0038A8',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  calendarContainer: {
    height: Dimensions.get('window').height * 0.6,
    marginBottom: 20,
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
  },
  toggleText: { color: '#fff', fontWeight: 'bold' },
  picker: { marginVertical: 10 },
  loader: { marginTop: 20 },
  card: {
    backgroundColor: '#f2f2ff',
    padding: 12,
    borderRadius: 10,
    borderColor: '#ADAFAA',
    borderWidth: 1,
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: 'bold', color: '#0038A8' },
  details: { marginTop: 4, color: '#555' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  button: { padding: 8, borderRadius: 6 },
  register: { backgroundColor: '#F7B910' },
  unregister: { backgroundColor: '#C40043' },
  detailsBtn: { backgroundColor: '#330066' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
