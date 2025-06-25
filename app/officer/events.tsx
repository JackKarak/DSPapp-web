import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type Event = {
  id: string;
  title: string;
  location: string;
  start_time: string;
  end_time: string;
  point_value: number;
  status: 'pending' | 'approved' | 'not_approved';
};

type UserWithName = {
  user_id: string;
  profiles: { full_name: string } | { full_name: string }[];
};

export default function EventPage() {
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [approvedEvents, setApprovedEvents] = useState<Event[]>([]);
  const [notApprovedEvents, setNotApprovedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      setLoading(false);
      return;
    }

    const pending = data.filter(event => event.status === 'pending');
    const approved = data.filter(event => event.status === 'approved');
    const notApproved = data.filter(event => event.status === 'not_approved');

    setPendingEvents(pending);
    setApprovedEvents(approved);
    setNotApprovedEvents(notApproved);
    setLoading(false);
  };

  const fetchNames = async (eventId: string, type: 'registered' | 'attended') => {
    const table = type === 'registered' ? 'registrations' : 'attendances';

    const { data, error } = await supabase
      .from(table)
      .select('user_id, profiles(full_name)')
      .eq('event_id', eventId);

    if (error) {
      console.error(`Error fetching ${type} for event ${eventId}:`, error);
      return [];
    }

    return (data as any[]).map(entry => {
      const profile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
      return profile?.full_name || 'Unknown';
    });
  };

  const renderEventSection = (title: string, events: Event[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {events.length === 0 ? (
        <Text style={styles.empty}>No events</Text>
      ) : (
        events.map(event => (
          <EventCard key={event.id} event={event} fetchNames={fetchNames} />
        ))
      )}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>📅 Events Dashboard</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#F7B910" />
      ) : (
        <>
          {renderEventSection('Pending Approval', pendingEvents)}
          {renderEventSection('Approved Events', approvedEvents)}
          {renderEventSection('Not Approved Events', notApprovedEvents)}
        </>
      )}
    </ScrollView>
  );
}

type EventCardProps = {
  event: Event;
  fetchNames: (eventId: string, type: 'registered' | 'attended') => Promise<string[]>;
};

function EventCard({ event, fetchNames }: EventCardProps) {
  const [registered, setRegistered] = useState<string[]>([]);
  const [attended, setAttended] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNames();
  }, []);

  const loadNames = async () => {
    setLoading(true);
    const reg = await fetchNames(event.id, 'registered');
    const att = await fetchNames(event.id, 'attended');
    setRegistered(reg);
    setAttended(att);
    setLoading(false);
  };

  const getStatusColor = () => {
    switch (event.status) {
      case 'approved':
        return '#0038A8'; // Blue
      case 'pending':
        return '#F7B910'; // Gold
      case 'not_approved':
        return '#C40043'; // Red
      default:
        return '#000';
    }
  };

  return (
    <View style={styles.card}>
      <Text style={[styles.cardTitle, { color: getStatusColor() }]}>{event.title}</Text>
      <Text style={styles.cardText}>📍 {event.location}</Text>
      <Text style={styles.cardText}>
        🕒 {new Date(event.start_time).toLocaleString()} – {new Date(event.end_time).toLocaleTimeString()}
      </Text>
      <Text style={styles.cardText}>⭐ {event.point_value} points</Text>

      {loading ? (
        <Text>Loading attendees...</Text>
      ) : (
        <>
          <Text style={styles.subHeader}>Registered Brothers:</Text>
          {registered.length > 0 ? (
            registered.map(name => <Text key={name} style={styles.listItem}>• {name}</Text>)
          ) : (
            <Text style={styles.empty}>None</Text>
          )}
          <Text style={styles.subHeader}>Attended Brothers:</Text>
          {attended.length > 0 ? (
            attended.map(name => <Text key={name} style={styles.listItem}>• {name}</Text>)
          ) : (
            <Text style={styles.empty}>None</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#330066',
    marginVertical: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#0038A8',
  },
  card: {
    backgroundColor: '#ffffffcc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderColor: '#ADAFAA',
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    marginBottom: 2,
    color: '#000',
  },
  subHeader: {
    marginTop: 10,
    fontWeight: '600',
    color: '#0038A8',
  },
  listItem: {
    marginLeft: 8,
    fontSize: 14,
  },
  empty: {
    fontStyle: 'italic',
    color: '#ADAFAA',
    marginLeft: 8,
  },
});
