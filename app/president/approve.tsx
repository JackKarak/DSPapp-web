import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface PendingEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  point_type: string;
  point_value: number;
  created_by: string;
  creator_name: string;
  is_registerable: boolean;
  available_to_pledges: boolean;
  status: string;
}

export default function EventApproval() {
  const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingEventIds, setProcessingEventIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      const { data: userData, error: profileError } = await supabase
        .from('users')
        .select('role, officer_position')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userData) {
        Alert.alert('Access Denied', 'Unable to verify permissions.');
        router.replace('/(tabs)');
        return;
      }

      // Only presidents/admins can approve events
      if (userData.role !== 'admin' && userData.officer_position !== 'president') {
        Alert.alert('Access Denied', 'Only presidents can approve events.');
        router.replace('/(tabs)');
        return;
      }

      fetchPendingEvents();
    } catch (error) {
      console.error('Access check failed:', error);
      Alert.alert('Error', 'Failed to verify access permissions.');
      router.replace('/(tabs)');
    }
  };

  const fetchPendingEvents = async () => {
    try {
      setLoading(true);

      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, title, description, start_time, end_time, location, point_type, point_value, created_by, is_registerable, available_to_pledges, status')
        .eq('status', 'pending')
        .order('start_time', { ascending: true });

      if (eventsError) {
        console.error('Events Error:', eventsError);
        Alert.alert('Error', 'Failed to load pending events.');
        return;
      }

      if (!eventsData || eventsData.length === 0) {
        setPendingEvents([]);
        return;
      }

      // Fetch creator names
      const createdByIds = [...new Set(eventsData.map(e => e.created_by))];
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, first_name, last_name')
        .in('user_id', createdByIds);

      if (usersError) {
        console.error('Users Error:', usersError);
      }

      const usersMap = usersData?.reduce((acc, user) => {
        const fullName = user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}` 
          : 'Unknown User';
        acc[user.user_id] = fullName;
        return acc;
      }, {} as Record<string, string>) || {};

      const enrichedEvents = eventsData.map(event => ({
        ...event,
        creator_name: usersMap[event.created_by] || 'Unknown User',
      }));

      setPendingEvents(enrichedEvents);
    } catch (error) {
      console.error('Error fetching pending events:', error);
      Alert.alert('Error', 'Failed to load pending events.');
    } finally {
      setLoading(false);
    }
  };

  const approveEvent = async (eventId: string) => {
    try {
      setProcessingEventIds(prev => new Set(prev).add(eventId));

      const { error } = await supabase
        .from('events')
        .update({ status: 'approved' })
        .eq('id', eventId);

      if (error) {
        console.error('Approval Error:', error);
        Alert.alert('Error', 'Failed to approve event.');
        return;
      }

      Alert.alert('Success', 'Event approved successfully!');
      fetchPendingEvents(); // Refresh the list
    } catch (error) {
      console.error('Error approving event:', error);
      Alert.alert('Error', 'Failed to approve event.');
    } finally {
      setProcessingEventIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
    }
  };

  const rejectEvent = async (eventId: string) => {
    try {
      setProcessingEventIds(prev => new Set(prev).add(eventId));

      const { error } = await supabase
        .from('events')
        .update({ status: 'rejected' })
        .eq('id', eventId);

      if (error) {
        console.error('Rejection Error:', error);
        Alert.alert('Error', 'Failed to reject event.');
        return;
      }

      Alert.alert('Success', 'Event rejected.');
      fetchPendingEvents(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting event:', error);
      Alert.alert('Error', 'Failed to reject event.');
    } finally {
      setProcessingEventIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#330066" />
        <Text style={styles.loadingText}>Loading pending events...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Event Approval</Text>
      <Text style={styles.subtitle}>Review and approve pending events</Text>

      {pendingEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>🎉 No pending events</Text>
          <Text style={styles.emptySubtext}>All events have been reviewed</Text>
        </View>
      ) : (
        <View style={styles.eventsContainer}>
          {pendingEvents.map((event) => {
            const isProcessing = processingEventIds.has(event.id);
            
            return (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View style={styles.typeTag}>
                    <Text style={styles.typeTagText}>
                      {event.point_type.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.eventDescription}>{event.description}</Text>

                <View style={styles.eventDetails}>
                  <Text style={styles.detailLabel}>📅 Start: {formatDateTime(event.start_time)}</Text>
                  <Text style={styles.detailLabel}>🕐 End: {formatDateTime(event.end_time)}</Text>
                  <Text style={styles.detailLabel}>📍 Location: {event.location}</Text>
                  <Text style={styles.detailLabel}>🏆 Points: {event.point_value}</Text>
                  <Text style={styles.detailLabel}>👤 Created by: {event.creator_name}</Text>
                </View>

                <View style={styles.badgeContainer}>
                  {event.is_registerable && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Registerable</Text>
                    </View>
                  )}
                  {event.available_to_pledges && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Open to Pledges</Text>
                    </View>
                  )}
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.approveButton, isProcessing && styles.disabledButton]}
                    onPress={() => approveEvent(event.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.approveButtonText}>✓ Approve</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.rejectButton, isProcessing && styles.disabledButton]}
                    onPress={() => rejectEvent(event.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.rejectButtonText}>✗ Reject</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#330066',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
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
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#330066',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  eventsContainer: {
    gap: 16,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginRight: 12,
  },
  typeTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3730a3',
  },
  eventDescription: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
    lineHeight: 22,
  },
  eventDetails: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  badge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
