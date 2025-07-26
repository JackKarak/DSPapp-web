// app/(tabs)/calendarview.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Calendar } from 'react-native-calendars';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

type Event = {
  id: string;
  title: string;
  start_time: string;
  location: string;
  point_value: number;
  point_type: string;
};

export default function CalendarView() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [markedDates, setMarkedDates] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedType, setSelectedType] = useState<string>('All');
  const router = useRouter();

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      filterEventsByDateAndType(selectedDate, selectedType);
    }
    markEventDates(events);
  }, [selectedType, events]);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'approved');

    if (error) {
      Alert.alert('Error fetching events', error.message);
      setLoading(false);
      return;
    }

    setEvents(data || []);
    setLoading(false);
  };

  const markEventDates = (eventList: Event[]) => {
    const marks: { [key: string]: any } = {};
    eventList.forEach(event => {
      if (selectedType !== 'All' && event.point_type !== selectedType) return;

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
    filterEventsByDateAndType(day.dateString, selectedType);
  };

  const filterEventsByDateAndType = (date: string, type: string) => {
    let filtered = events.filter(e => e.start_time.startsWith(date));
    if (type !== 'All') {
      filtered = filtered.filter(e => e.point_type === type);
    }
    setFilteredEvents(filtered);
  };

  const uniqueTypes = Array.from(new Set(events.map(e => e.point_type)));

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>📅 Calendar View</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/brotherindex')}
          style={styles.switchButton}
        >
          <Text style={styles.switchText}>List View</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <Calendar
          onDayPress={handleDayPress}
          markedDates={{
            ...markedDates,
            ...(selectedDate ? {
              [selectedDate]: {
                ...(markedDates[selectedDate] || {}),
                selected: true,
                selectedColor: '#330066'
              }
            } : {})
          }}
          markingType="multi-dot"
          theme={{
            todayTextColor: '#0038A8',
            arrowColor: '#330066',
            selectedDayBackgroundColor: '#330066',
            selectedDayTextColor: '#fff',
            dotColor: '#F7B910',
            textSectionTitleColor: '#0038A8'
          }}
        />
      )}

      {selectedDate && (
        <View style={styles.eventSection}>
          <Text style={styles.sectionHeader}>
            Events on {selectedDate} ({filteredEvents.length})
          </Text>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Filter by type:</Text>
            <Picker
              selectedValue={selectedType}
              style={styles.picker}
              onValueChange={(itemValue) => setSelectedType(itemValue)}
            >
              <Picker.Item label="All" value="All" />
              {uniqueTypes.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
          </View>

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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#330066',
  },
  switchButton: {
    backgroundColor: '#0038A8',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  switchText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 40,
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  filterLabel: {
    marginRight: 10,
    fontWeight: '600',
  },
  picker: {
    flex: 1,
    height: 40,
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
