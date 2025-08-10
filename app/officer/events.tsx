import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, Button } from 'react-native';
import { supabase } from '../../lib/supabase';

type Event = {
  id: number;
  title: string;
  location: string;
  start_time: string;
  end_time: string;
  status: string;
  code: string | null;
  denial_note: string | null;
};

export default function OfficerEvents() {
  const [approvedEvents, setApprovedEvents] = useState<Event[]>([]);
  const [deniedEvents, setDeniedEvents] = useState<Event[]>([]);
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser();

    const user = authData?.user;

    if (authError || !user) {
      Alert.alert('Authentication Error', authError?.message || 'User not authenticated');
      setLoading(false);
      return;
    }

    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, location, start_time, end_time, status, code, denial_note')
      .eq('created_by', user.id);

    if (error) {
      Alert.alert('Error Fetching Events', error.message);
    } else {
      setApprovedEvents(events.filter((e) => e.status === 'approved'));
      setDeniedEvents(events.filter((e) => e.status === 'denied'));
      setPendingEvents(events.filter((e) => e.status === 'pending'));
    }

    setLoading(false);
  };

  const cancelEvent = async (eventId: number) => {
    Alert.alert('Cancel Event', 'Are you sure you want to cancel this event?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          const { error } = await supabase.from('events').delete().eq('id', eventId);
          if (error) {
            Alert.alert('Error', error.message);
          } else {
            Alert.alert('Event Cancelled');
            fetchEvents();
          }
        },
      },
    ]);
  };

  const renderEvent = (event: Event) => (
    <View key={event.id} style={styles.eventCard}>
      <Text style={styles.eventTitle}>{event.title}</Text>
      <Text style={styles.eventDetail}>Location: {event.location}</Text>
      <Text style={styles.eventDetail}>
        Time: {new Date(event.start_time).toLocaleString()} -{' '}
        {new Date(event.end_time).toLocaleTimeString()}
      </Text>
      {event.status === 'approved' && event.code && (
        <Text style={styles.eventDetail}>Event Code: {event.code}</Text>
      )}
      {event.status === 'denied' && event.denial_note && (
        <Text style={styles.eventDetail}>Denial Note: {event.denial_note}</Text>
      )}
      <View style={styles.buttonWrapper}>
        <Button title="Cancel Event" onPress={() => cancelEvent(event.id)} color="#C40043" />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#330066" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Pending Events</Text>
      {pendingEvents.length === 0 ? (
        <Text style={styles.noEvents}>No pending events.</Text>
      ) : (
        pendingEvents.map(renderEvent)
      )}

      <Text style={styles.header}>Approved Events</Text>
      {approvedEvents.length === 0 ? (
        <Text style={styles.noEvents}>No approved events.</Text>
      ) : (
        approvedEvents.map(renderEvent)
      )}

      <Text style={styles.header}>Not Approved</Text>
      {deniedEvents.length === 0 ? (
        <Text style={styles.noEvents}>No denied events.</Text>
      ) : (
        deniedEvents.map(renderEvent)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#330066',
    marginTop: 20,
    marginBottom: 10,
  },
  eventCard: {
    backgroundColor: '#f9f9f9',
    borderColor: '#ADAFAA',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#0038A8',
  },
  eventDetail: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  noEvents: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  buttonWrapper: {
    marginTop: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});