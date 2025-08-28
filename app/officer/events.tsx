import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  is_registerable?: boolean;
  registrationCount?: number;
};

export default function OfficerEventsManagement() {
  const [approvedEvents, setApprovedEvents] = useState<Event[]>([]);
  const [deniedEvents, setDeniedEvents] = useState<Event[]>([]);
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
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
      .select('id, title, location, start_time, end_time, status, code, denial_note, is_registerable')
      .eq('created_by', user.id)
      .order('start_time', { ascending: false });

    if (error) {
      Alert.alert('Error Fetching Events', error.message);
    } else if (events) {
      // Fetch registration counts for registerable events
      const registerableEventIds = events
        .filter(event => event.is_registerable)
        .map(event => event.id);

      let registrationCounts: Record<number, number> = {};

      if (registerableEventIds.length > 0) {
        const { data: registrations, error: regError } = await supabase
          .from('event_registration')
          .select('event_id')
          .in('event_id', registerableEventIds);

        if (!regError && registrations) {
          // Count registrations per event
          registrationCounts = registrations.reduce((acc, reg) => {
            acc[reg.event_id] = (acc[reg.event_id] || 0) + 1;
            return acc;
          }, {} as Record<number, number>);
        }
      }

      // Add registration counts to events
      const eventsWithCounts = events.map(event => ({
        ...event,
        registrationCount: event.is_registerable ? (registrationCounts[event.id] || 0) : undefined
      }));

      const now = new Date();
      
      // Separate events into current and past based on end_time
      const currentEvents = eventsWithCounts.filter((e) => new Date(e.end_time) >= now);
      const pastEventsList = eventsWithCounts.filter((e) => new Date(e.end_time) < now);
      
      // Filter current events by status
      setApprovedEvents(currentEvents.filter((e) => e.status === 'approved'));
      setDeniedEvents(currentEvents.filter((e) => e.status === 'denied'));
      setPendingEvents(currentEvents.filter((e) => e.status === 'pending'));
      
      // Past events (regardless of status)
      setPastEvents(pastEventsList);
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
            fetchEvents(); // Refresh the list
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
        Start: {new Date(event.start_time).toLocaleString()}
      </Text>
      <Text style={styles.eventDetail}>
        End: {new Date(event.end_time).toLocaleString()}
      </Text>
      {event.is_registerable && typeof event.registrationCount === 'number' && (
        <Text style={[styles.eventDetail, styles.registrationCount]}>
          👥 Registered: {event.registrationCount} member{event.registrationCount !== 1 ? 's' : ''}
        </Text>
      )}
      {event.status === 'approved' && event.code && (
        <Text style={[styles.eventDetail, styles.eventCode]}>
          Event Code: {event.code}
        </Text>
      )}
      {event.status === 'denied' && event.denial_note && (
        <Text style={[styles.eventDetail, styles.denialNote]}>
          Denial Reason: {event.denial_note}
        </Text>
      )}
      <View style={styles.buttonWrapper}>
        <Button title="Cancel Event" onPress={() => cancelEvent(event.id)} color="#DC3545" />
      </View>
    </View>
  );

  const renderPastEvent = (event: Event) => (
    <View key={event.id} style={styles.eventCard}>
      <Text style={styles.eventTitle}>{event.title}</Text>
      <Text style={styles.eventDetail}>Location: {event.location}</Text>
      <Text style={styles.eventDetail}>
        Start: {new Date(event.start_time).toLocaleString()}
      </Text>
      <Text style={styles.eventDetail}>
        End: {new Date(event.end_time).toLocaleString()}
      </Text>
      <Text style={[styles.eventDetail, styles.statusText]}>
        Status: {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
      </Text>
      {event.is_registerable && typeof event.registrationCount === 'number' && (
        <Text style={[styles.eventDetail, styles.registrationCount]}>
          👥 Final Registration: {event.registrationCount} member{event.registrationCount !== 1 ? 's' : ''}
        </Text>
      )}
      {event.status === 'approved' && event.code && (
        <Text style={[styles.eventDetail, styles.eventCode]}>
          Event Code: {event.code}
        </Text>
      )}
      {event.status === 'denied' && event.denial_note && (
        <Text style={[styles.eventDetail, styles.denialNote]}>
          Denial Reason: {event.denial_note}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#330066" />
        <Text style={styles.loadingText}>Loading your events...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.mainTitle}>My Events</Text>
        <Text style={styles.subtitle}>Manage your created events</Text>
      </View>

      <Text style={styles.sectionHeader}>Pending Approval ({pendingEvents.length})</Text>
      {pendingEvents.length === 0 ? (
        <Text style={styles.noEvents}>No pending events.</Text>
      ) : (
        pendingEvents.map(renderEvent)
      )}

      <Text style={styles.sectionHeader}>Approved Events ({approvedEvents.length})</Text>
      {approvedEvents.length === 0 ? (
        <Text style={styles.noEvents}>No approved events.</Text>
      ) : (
        approvedEvents.map(renderEvent)
      )}

      <Text style={styles.sectionHeader}>Denied Events ({deniedEvents.length})</Text>
      {deniedEvents.length === 0 ? (
        <Text style={styles.noEvents}>No denied events.</Text>
      ) : (
        deniedEvents.map(renderEvent)
      )}

      <Text style={styles.sectionHeader}>Past Events ({pastEvents.length})</Text>
      {pastEvents.length === 0 ? (
        <Text style={styles.noEvents}>No past events.</Text>
      ) : (
        pastEvents.map(renderPastEvent)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    paddingBottom: 80,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#330066',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  sectionHeader: {
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    color: '#0038A8',
  },
  eventDetail: {
    fontSize: 14,
    color: '#333',
    marginBottom: 3,
  },
  eventCode: {
    fontWeight: '600',
    color: '#28a745',
  },
  registrationCount: {
    fontWeight: '600',
    color: '#6366f1',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  denialNote: {
    color: '#dc3545',
    fontWeight: '500',
  },
  statusText: {
    fontWeight: '600',
    color: '#0038A8',
  },
  noEvents: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
    textAlign: 'center',
    padding: 20,
  },
  buttonWrapper: {
    marginTop: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
