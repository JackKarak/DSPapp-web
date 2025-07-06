import { useEffect, useState } from 'react';
import { Alert, FlatList, Text, View, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ConfirmEventsScreen() {
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'pending')
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error.message);
      Alert.alert('Error', error.message);
    } else {
      setPendingEvents(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (eventId: number, newStatus: 'approved' | 'denied') => {
    const { error } = await supabase
      .from('events')
      .update({ status: newStatus })
      .eq('id', eventId);

    if (error) {
      console.error('Status update error:', error.message);
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', `Event ${newStatus}`);
      fetchPendingEvents();
    }
  };

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  const renderEvent = ({ item }: { item: any }) => (
    <View style={styles.eventCard}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.detail}>{item.description}</Text>
      <Text style={styles.detail}>📍 {item.location}</Text>
      <Text style={styles.detail}>🗓 {new Date(item.start_time).toLocaleString()} - {new Date(item.end_time).toLocaleTimeString()}</Text>
      <Text style={styles.detail}>🔑 Code: {item.code}</Text>
      <View style={styles.buttonRow}>
        <Button title="✅ Approve" onPress={() => updateStatus(item.id, 'approved')} color="#28a745" />
        <Button title="❌ Deny" onPress={() => updateStatus(item.id, 'denied')} color="#dc3545" />
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
    <FlatList
      data={pendingEvents}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderEvent}
      contentContainerStyle={styles.container}
      ListEmptyComponent={<Text style={styles.noEvents}>No pending events.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  eventCard: {
    backgroundColor: '#fff',
    borderColor: '#ADAFAA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#330066',
    marginBottom: 4,
  },
  detail: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noEvents: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
    color: '#666',
  },
});
