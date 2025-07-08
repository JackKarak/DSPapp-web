// app/(tabs)/calendarview.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../../lib/supabase';

type Event = {
  id: string;
  title: string;
  start_time: string;
  location: string;
  point_value: number;
};

export default function CalendarView() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [markedDates, setMarkedDates] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'approved');

    if (error) {
      Alert.alert('Error fetching events', error.message);
      return;
    }

    setEvents(data || []);
    markEventDates(data || []);
  };

  const markEventDates = (eventList: Event[]) => {
    const marks: { [key: string]: any } = {};
    eventList.forEach(event => {
      const date = event.start_time.split('T')[0];
      marks[date] = { marked: true, dotColor: '#F7B910' };
    });
    setMarkedDates(marks);
  };

  const handleDayPress = (day: { dateString: string }) => {
    setSelectedDate(day.dateString);
    const filtered = events.filter(e => e.start_time.startsWith(day.dateString));
    setFilteredEvents(filtered);
  };

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={handleDayPress}
        markedDates={{
          ...markedDates,
          ...(selectedDate ? { [selectedDate]: { selected: true, selectedColor: '#330066' } } : {}),
        }}
        theme={{
          todayTextColor: '#0038A8',
          arrowColor: '#330066',
        }}
      />

      {selectedDate && (
        <View style={styles.eventSection}>
          <Text style={styles.sectionHeader}>
            Events on {selectedDate} ({filteredEvents.length})
          </Text>
          <FlatList
            data={filteredEvents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.eventCard}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventDetail}>
                  🕒 {new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {'  '}📍 {item.location}
                </Text>
                <Text style={styles.eventPoints}>🎯 {item.point_value} pts</Text>
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 20,
  },
  eventSection: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#330066',
    marginBottom: 10,
  },
  eventCard: {
    backgroundColor: '#f2f2ff',
    borderWidth: 1,
    borderColor: '#ADAFAA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0038A8',
  },
  eventDetail: {
    marginTop: 4,
    color: '#555',
  },
  eventPoints: {
    marginTop: 6,
    color: '#F7B910',
    fontWeight: '600',
  },
});
