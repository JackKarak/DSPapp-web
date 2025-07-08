//Talk to Xylea about new test bank system
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import backgroundImg from '../../assets/images/background.png';

type Event = {
  id: string;
  title: string;
  date: string;
  receipt_url: string;
};

export default function AccountTab() {
  const [name, setName] = useState<string | null>(null);
  const [pledgeClass, setPledgeClass] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const toggleExpand = (id: string) => {
    setExpandedEventId(prev => (prev === id ? null : id));
  };

  useEffect(() => {
    const fetchAccountData = async () => {
      setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('Auth error:', authError?.message);
        Alert.alert('Error', 'Unable to load user session.');
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('name, pledge_class, approved')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        Alert.alert('Profile Error', 'Unable to fetch user profile.');
        setLoading(false);
        return;
      }

      if (!profile.approved) {
        Alert.alert('Pending Approval', 'Your account has not been approved yet.');
        setLoading(false);
        return;
      }

      setName(profile.name);
      setPledgeClass(profile.pledge_class);

      const { data: attendedEvents, error: eventError } = await supabase
        .from('event_attendance')
        .select('id, events(title, date, receipt_url)')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (eventError) {
        console.error('Attendance fetch error:', eventError.message);
        Alert.alert('Error', 'Could not load your attended events.');
      } else {
        const formattedEvents: Event[] = (attendedEvents || []).map((record: any) => ({
          id: record.id,
          title: record.events.title,
          date: record.events.date,
          receipt_url: record.events.receipt_url,
        }));
        setEvents(formattedEvents);
      }

      setLoading(false);
    };

    fetchAccountData();
  }, []);

  return (
    <ImageBackground source={backgroundImg} style={styles.background}>
      <View style={styles.overlay}>
        <Text style={styles.welcome}>👋 Brother {name ?? '...'}</Text>
        <Text style={styles.meta}>Pledge Class: {pledgeClass ?? '...'}</Text>
        <Text style={styles.meta}>Events Attended: {events.length}</Text>

        <Text style={styles.sectionHeader}>📸 Event Receipts</Text>

        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : events.length === 0 ? (
          <Text style={styles.noContent}>No events found for your account.</Text>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.details}>{new Date(item.date).toLocaleDateString()}</Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleExpand(item.id)}>
                    <Text style={styles.toggle}>
                      {expandedEventId === item.id ? 'Hide' : 'View'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {expandedEventId === item.id && (
                  <Image
                    source={{ uri: item.receipt_url }}
                    style={styles.receipt}
                    resizeMode="contain"
                  />
                )}
              </View>
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
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  welcome: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0038A8',
    marginBottom: 8,
    textAlign: 'center',
  },
  meta: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginBottom: 4,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#330066',
    marginTop: 20,
    marginBottom: 12,
  },
  loader: {
    marginTop: 20,
  },
  noContent: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
  listContainer: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#eef1ff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0038A8',
  },
  details: {
    fontSize: 13,
    color: '#555',
  },
  toggle: {
    color: '#007AFF',
    fontSize: 14,
  },
  receipt: {
    width: '100%',
    height: 200,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#ddd',
  },
});
