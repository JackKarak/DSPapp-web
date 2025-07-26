import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Text,
  View,
  StyleSheet,
  Button,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';

function generateRandomCode(length = 5) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function ConfirmEventsScreen() {
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        title,
        location,
        start_time,
        end_time,
        created_by,
        users (
          name
        )
      `)
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

  const approveEvent = async (eventId: number) => {
    const code = generateRandomCode();

    const { error } = await supabase
      .from('events')
      .update({ status: 'approved', code })
      .eq('id', eventId);

    if (error) {
      console.error('Approval error:', error.message);
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', `Event approved with code: ${code}`);
      fetchPendingEvents();
    }
  };

  const denyEvent = (eventId: number) => {
    if (Platform.OS === 'web') {
      const note = prompt('Enter a note explaining the denial:');
      if (note !== null) {
        submitDenial(eventId, note);
      }
    } else {
      Alert.prompt(
        'Deny Event',
        'Please enter a note for denial:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Submit',
            onPress: (note) => {
              if (note) {
                submitDenial(eventId, note);
              }
            },
          },
        ],
        'plain-text'
      );
    }
  };

  const submitDenial = async (eventId: number, note: string) => {
    const { error } = await supabase
      .from('events')
      .update({ status: 'denied', denial_note: note })
      .eq('id', eventId);

    if (error) {
      console.error('Denial error:', error.message);
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Event denied');
      fetchPendingEvents();
    }
  };

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  const renderEvent = ({ item }: { item: any }) => {
    const start = new Date(item.start_time);
    const end = new Date(item.end_time);

    return (
      <View style={styles.eventCard}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.detail}>Created by: {item.users?.name || 'Unknown'}</Text>
        <Text style={styles.detail}>Location: {item.location}</Text>
        <Text style={styles.detail}>
          Time: {start.toLocaleDateString()} {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
          {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>

        <View style={styles.buttonRow}>
          <Button title="Approve" onPress={() => approveEvent(item.id)} color="#28a745" />
          <Button title="Deny" onPress={() => denyEvent(item.id)} color="#dc3545" />
        </View>
      </View>
    );
  };

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
