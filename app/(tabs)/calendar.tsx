import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ImageBackground,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type Event = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  point_value: number;
};

export default function CalendarTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'confirmed')
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  return (
      <View style={styles.overlay}>
        <Text style={styles.header}>📅 Upcoming Events</Text>

        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" color="#F7B910" />
        ) : events.length === 0 ? (
          <Text style={styles.noEvents}>No confirmed events yet.</Text>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/event/${item.id}`)}
              >
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.details}>
                  {new Date(item.start_time).toLocaleString()} @ {item.location}
                </Text>
                <Text style={styles.points}>🎯 {item.point_value} pts</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  loader: {
    marginTop: 50,
  },
  listContainer: {
    paddingBottom: 100,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#330066', // Purple
    textAlign: 'center',
  },
  noEvents: {
    textAlign: 'center',
    fontSize: 16,
    color: '#ADAFAA', // Silver
    marginTop: 20,
  },
  card: {
    backgroundColor: '#f2f2ff',
    borderWidth: 1,
    borderColor: '#ADAFAA',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0038A8', // Blue
  },
  details: {
    marginTop: 6,
    fontSize: 14,
    color: '#555',
  },
  points: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#F7B910', // Gold
  },
});
