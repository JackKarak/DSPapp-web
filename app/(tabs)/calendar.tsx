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
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

export default function CalendarTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
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

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('name, approved')
        .eq('user_id', user.id)
        .single();

      console.log('Fetched profile:', profile);
      console.log('Profile error:', profileError);

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

      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'confirmed')
        .order('start_time', { ascending: true });

      if (eventsError) {
        console.error('Events error:', eventsError.message);
      } else {
        setEvents(eventsData || []);
      }

      // Fetch announcements
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (announcementsError) {
        console.error('Announcements error:', announcementsError.message);
      } else {
        setAnnouncements(announcementsData || []);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <ImageBackground source={backgroundImg} style={styles.background}>
      <View style={styles.overlay}>
        <Text style={styles.welcome}>👋 Welcome, Brother {brotherName ?? '...'}</Text>

        <Text style={styles.sectionHeader}>📢 Announcements</Text>
        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : announcements.length === 0 ? (
          <Text style={styles.noContent}>No announcements yet.</Text>
        ) : (
          announcements.map((a) => (
            <View key={a.id} style={styles.announcementCard}>
              <Text style={styles.announcementTitle}>{a.title}</Text>
              <Text style={styles.announcementMessage}>{a.message}</Text>
            </View>
          ))
        )}

        <Text style={styles.sectionHeader}>📅 Upcoming Events</Text>
        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : events.length === 0 ? (
          <Text style={styles.noContent}>No confirmed events yet.</Text>
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
  announcementCard: {
    backgroundColor: '#fff0e6',
    borderWidth: 1,
    borderColor: '#F7B910',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  announcementTitle: {
    fontWeight: '600',
    fontSize: 16,
    color: '#C40043',
    marginBottom: 4,
  },
  announcementMessage: {
    fontSize: 14,
    color: '#333',
  },
});
