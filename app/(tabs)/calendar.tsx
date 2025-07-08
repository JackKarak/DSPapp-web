import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import backgroundImg from '../../assets/images/background.png';

type Event = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  point_value: number;
  point_type: string;
};

export default function CalendarTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [registeredEventIds, setRegisteredEventIds] = useState<string[]>([]);
  const [brotherName, setBrotherName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Auth error:', userError?.message);
        Alert.alert('Error', 'Unable to load user session.');
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('name, approved')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        Alert.alert('Profile Error', 'Missing or unauthorized profile data.');
        setLoading(false);
        return;
      }

      if (!profile.approved) {
        Alert.alert('Pending Approval', 'Your account has not been approved yet.');
        setLoading(false);
        return;
      }

      setBrotherName(profile.name || 'Brother');

      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'approved')
        .order('start_time', { ascending: true });

      if (eventsError) {
        console.error('Events error:', eventsError.message);
      } else {
        setEvents(eventsData || []);
      }

      const { data: registrations, error: regError } = await supabase
        .from('event_registration')
        .select('event_id')
        .eq('user_id', user.id);

      if (regError) {
        console.error('Registration fetch error:', regError.message);
      } else {
        setRegisteredEventIds(registrations.map((r) => r.event_id));
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const handleRegister = async (eventId: string) => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      Alert.alert('Error', 'Could not find user session.');
      return;
    }

    if (registeredEventIds.includes(eventId)) {
      Alert.alert('Already Registered', 'You are already registered for this event.');
      return;
    }

    const { error } = await supabase.from('event_registration').insert([
      {
        user_id: user.id,
        event_id: eventId,
      },
    ]);

    if (error) {
      Alert.alert('Registration Failed', error.message);
    } else {
      Alert.alert('Success', 'You have been registered for the event!');
      setRegisteredEventIds((prev) => [...prev, eventId]);
    }
  };

  const handleUnregister = async (eventId: string) => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      Alert.alert('Error', 'Could not find user session.');
      return;
    }

    const { error } = await supabase
      .from('event_registration')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user.id);

    if (error) {
      Alert.alert('Unregister Failed', error.message);
    } else {
      Alert.alert('Unregistered', 'You have been removed from the event.');
      setRegisteredEventIds((prev) => prev.filter((id) => id !== eventId));
    }
  };

  return (
    <ImageBackground source={backgroundImg} style={styles.background}>
      <View style={styles.overlay}>
        <Text style={styles.welcome}> Welcome, Brother {brotherName ?? '...'}</Text>

        <Text style={styles.sectionHeader}>Upcoming Events</Text>
        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : events.length === 0 ? (
          <Text style={styles.noContent}>No approved events yet.</Text>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => {
              const isRegistered = registeredEventIds.includes(item.id);

              return (
                <View style={styles.card}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.details}>
                    {new Date(item.start_time).toLocaleString()} @ {item.location}
                  </Text>
                  <Text style={styles.points}>Earn a {item.point_type} point</Text>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[
                        styles.button,
                        isRegistered ? styles.buttonUnregister : styles.buttonRegister,
                      ]}
                      onPress={() =>
                        isRegistered ? handleUnregister(item.id) : handleRegister(item.id)
                      }
                    >
                      <Text style={styles.buttonText}>
                        {isRegistered ? 'Unregister ❌' : 'Register'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.button, styles.detailsButton]}
                      onPress={() => router.push(`/event/${item.id}`)}
                    >
                      <Text style={styles.buttonText}>Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  welcome: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0038A8',
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#330066',
    marginTop: 12,
    marginBottom: 8,
  },
  noContent: {
    fontSize: 14,
    textAlign: 'center',
    color: '#ADAFAA',
    marginBottom: 8,
  },
  loader: {
    marginTop: 16,
  },
  listContainer: {
    paddingBottom: 100,
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
    color: '#0038A8',
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
    color: '#F7B910',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonRegister: {
    backgroundColor: '#F7B910',
  },
  buttonUnregister: {
    backgroundColor: '#C40043',
  },
  detailsButton: {
    backgroundColor: '#330066',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
