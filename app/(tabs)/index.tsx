import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Calendar } from 'react-native-calendars';
import { FlatList } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
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
};

export default function CalendarTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [registeredEventIds, setRegisteredEventIds] = useState<string[]>([]);
  const [brotherName, setBrotherName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarView, setCalendarView] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [markedDates, setMarkedDates] = useState<{ [key: string]: any }>({});
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
      .select('id, title, start_time, end_time, location, point_value, point_type, created_by')
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
    }));

    setEvents(enrichedEvents);
    markEventDates(enrichedEvents);

    const { data: registrations } = await supabase
      .from('event_registration')
      .select('event_id')
      .eq('user_id', user.id);

    setRegisteredEventIds(registrations?.map((r) => r.event_id) || []);
    setLoading(false);
  };

  const markEventDates = (eventList: Event[]) => {
    const marks: { [key: string]: any } = {};
    eventList.forEach(event => {
      const date = event.start_time.split('T')[0];
      if (!marks[date]) {
        marks[date] = { dots: [{ color: '#F7B910' }], marked: true };
      } else {
        marks[date].dots.push({ color: '#F7B910' });
      }
    });
    setMarkedDates(marks);
  };

  const handleDayPress = (day: { dateString: string }) => {
    setSelectedDate(day.dateString);
  };

  const filteredEvents = selectedDate
    ? events.filter(e => e.start_time.startsWith(selectedDate) && (selectedType === 'All' || e.point_type === selectedType))
    : events;

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
        <>
          <Calendar
            onDayPress={handleDayPress}
            markedDates={{
              ...markedDates,
              ...(selectedDate ? {
                [selectedDate]: {
                  ...(markedDates[selectedDate] || {}),
                  selected: true,
                  selectedColor: '#330066',
                },
              } : {})
            }}
            markingType="multi-dot"
            theme={{
              todayTextColor: '#0038A8',
              arrowColor: '#330066',
              selectedDayBackgroundColor: '#330066',
              selectedDayTextColor: '#fff',
              dotColor: '#F7B910',
              textSectionTitleColor: '#0038A8',
            }}
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
        </>
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
                <TouchableOpacity
                  style={[styles.button, isRegistered ? styles.unregister : styles.register]}
                  onPress={() =>
                    isRegistered ? handleUnregister(item.id) : handleRegister(item.id)
                  }
                >
                  <Text style={styles.buttonText}>{isRegistered ? 'Unregister' : 'Register'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.detailsBtn]}
                  onPress={() => router.push(`/event/${item.id}`)}
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
  container: { flex: 1, padding: 16 },
  header: { fontSize: 20, fontWeight: 'bold', color: '#330066', marginBottom: 12 },
  toggleBtn: {
    backgroundColor: '#0038A8',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
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
