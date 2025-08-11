import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

function generateRandomCode(length = 5) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function ConfirmEventsScreen() {
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchPendingEvents = async () => {
    setLoading(true);

    try {
      // Check authentication first
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          location,
          start_time,
          end_time,
          created_by,
          is_registerable,
          point_type,
          point_value,
          description,
          users!inner(first_name, last_name)
        `)
        .eq('status', 'pending')
        .order('start_time', { ascending: true });

      if (error) {
        Alert.alert('Events Error', 'Unable to load pending events. Please try again.');
        return;
      }

      setPendingEvents(data || []);
    } catch (error) {
      console.error('Error fetching pending events:', error);
      Alert.alert('Unexpected Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const approveEvent = async (eventId: number) => {
    // Generate attendance code for all approved events
    // Both registerable and non-registerable events get codes for attendance tracking
    const code = generateRandomCode();

    const { error } = await supabase
      .from('events')
      .update({ status: 'approved', code })
      .eq('id', eventId);

    if (error) {
      console.error('Approval error:', error.message);
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', `Event approved with attendance code: ${code}\n\nBrothers can now use this code to record attendance and earn points.`);
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
    const creatorName = item.users?.first_name && item.users?.last_name 
      ? `${item.users.first_name} ${item.users.last_name}` 
      : 'Unknown';

    return (
      <View style={styles.eventCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>PENDING</Text>
          </View>
        </View>
        
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created by:</Text>
            <Text style={styles.detailValue}>{creatorName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>{item.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{start.toLocaleDateString()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>
              {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {' '}
              {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Points:</Text>
            <Text style={styles.detailValue}>
              {item.point_value || 0} ({item.point_type || 'none'})
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <View style={styles.typeContainer}>
              <Text style={[
                styles.detailValue, 
                item.is_registerable ? styles.registerableEvent : styles.nonRegisterableEvent
              ]}>
                {item.is_registerable ? '📝 Registerable' : '📋 Non-Registerable'}
              </Text>
            </View>
          </View>
          {item.description && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Description:</Text>
              <Text style={styles.detailValue}>{item.description}</Text>
            </View>
          )}
        </View>

        <View style={styles.approvalNote}>
          <Text style={styles.approvalNoteText}>
            ℹ️ All approved events receive attendance codes, regardless of registration type
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.approveButton]} 
            onPress={() => approveEvent(item.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.approveButtonText}>✓ Approve</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.denyButton]} 
            onPress={() => denyEvent(item.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.denyButtonText}>✗ Deny</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading pending events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>📋 Confirm Events</Text>
      <Text style={styles.subtitle}>Review and approve pending events - all approved events receive attendance codes</Text>
      
      <FlatList
        data={pendingEvents}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEvent}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={true}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pending events</Text>
            <Text style={styles.emptySubtext}>All events have been reviewed</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d97706',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d97706',
    letterSpacing: 0.5,
  },
  cardDetails: {
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    textAlign: 'right',
    fontWeight: '500',
  },
  typeContainer: {
    alignItems: 'flex-end',
    flex: 1,
  },
  registerableEvent: {
    color: '#10b981',
    fontWeight: '600',
  },
  nonRegisterableEvent: {
    color: '#6366f1',
    fontWeight: '600',
  },
  approvalNote: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  approvalNoteText: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500',
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  denyButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  denyButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
