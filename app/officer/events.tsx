import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Button, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

// Helper function to format dates in EST timezone consistently
const formatDateTimeInEST = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

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
  registrations?: Registration[];
  formattedStartTime?: string;
  formattedEndTime?: string;
  isPast?: boolean;
};

type Registration = {
  id: number;
  user_id: string;
  full_name: string;
  email: string;
};

type Attendance = {
  id: number;
  user_id: string;
  full_name: string;
  email: string;
  attended_at: string;
};

export default function OfficerEventsManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state for showing registrations/attendance
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Memoized categorized events - compute once per events change
  const categorizedEvents = useMemo(() => {
    const approved = events.filter(e => !e.isPast && e.status === 'approved');
    const denied = events.filter(e => !e.isPast && e.status === 'denied');
    const pending = events.filter(e => !e.isPast && e.status === 'pending');
    const past = events.filter(e => e.isPast);
    
    return { approved, denied, pending, past };
  }, [events]);

  // Race condition prevention
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      await fetchEvents();
      if (!isMounted) return;
    };
    
    loadData();
    return () => { isMounted = false; };
  }, []);

  // Shared helper to fetch user details
  const fetchUsersDetails = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return new Map();
    
    const { data: users, error } = await supabase
      .from('users')
      .select('user_id, first_name, last_name, email')
      .in('user_id', userIds);

    if (error) {
      console.error('Error fetching user details:', error);
      return new Map();
    }

    const usersMap = new Map();
    users?.forEach(user => {
      usersMap.set(user.user_id, user);
    });
    return usersMap;
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      const user = authData?.user;

      if (authError) {
        throw new Error(`Authentication error: ${authError.message}`);
      }
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: events, error } = await supabase
        .from('events')
        .select('id, title, location, start_time, end_time, status, code, denial_note, is_registerable')
        .eq('created_by', user.id)
        .order('start_time', { ascending: false });

      if (error) {
        throw error;
      }

      if (!events) {
        setEvents([]);
        return;
      }

      // Fetch registration details for registerable events
      const registerableEventIds = events
        .filter(event => event.is_registerable)
        .map(event => event.id);

      let registrationCounts: Record<number, number> = {};
      let registrationDetails: Record<number, Registration[]> = {};

      if (registerableEventIds.length > 0) {
        const { data: registrations, error: regError } = await supabase
          .from('event_registration')
          .select('id, event_id, user_id')
          .in('event_id', registerableEventIds);

        if (regError) {
          console.error('Error fetching registrations:', regError);
        } else if (registrations && registrations.length > 0) {
          // Get unique user IDs efficiently
          const seenIds = new Set<string>();
          registrations.forEach(reg => seenIds.add(reg.user_id));
          const registrationUserIds = Array.from(seenIds);
          
          // Fetch user details using shared helper
          const regUsersMap = await fetchUsersDetails(registrationUserIds);

          // Count registrations per event and organize details
          registrations.forEach(reg => {
            const eventId = reg.event_id;
            
            // Count
            registrationCounts[eventId] = (registrationCounts[eventId] || 0) + 1;
            
            // Details
            if (!registrationDetails[eventId]) {
              registrationDetails[eventId] = [];
            }
            
            const user = regUsersMap.get(reg.user_id);
            const fullName = user?.first_name && user?.last_name 
              ? `${user.first_name} ${user.last_name}` 
              : 'Unknown User';
              
            registrationDetails[eventId].push({
              id: reg.id,
              user_id: reg.user_id,
              full_name: fullName,
              email: user?.email || 'Unknown Email',
            });
          });
        }
      }

      // Pre-compute ALL display values once
      const now = new Date();
      const enrichedEvents: Event[] = events.map(event => {
        const isPast = new Date(event.end_time) < now;
        
        return {
          ...event,
          registrationCount: event.is_registerable ? (registrationCounts[event.id] || 0) : undefined,
          registrations: event.is_registerable ? (registrationDetails[event.id] || []) : undefined,
          formattedStartTime: formatDateTimeInEST(event.start_time),
          formattedEndTime: formatDateTimeInEST(event.end_time),
          isPast
        };
      });

      setEvents(enrichedEvents);
    } catch (error) {
      console.error('Error in fetchEvents:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fetchUsersDetails]);

  const cancelEvent = useCallback(async (eventId: number) => {
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
  }, [fetchEvents]);

  const fetchAttendance = useCallback(async (eventId: number) => {
    setModalLoading(true);
    
    try {
      // First fetch attendance records
      const { data: attendance, error: attendanceError } = await supabase
        .from('event_attendance')
        .select('id, user_id, attended_at')
        .eq('event_id', eventId);

      if (attendanceError) {
        throw attendanceError;
      }

      if (!attendance || attendance.length === 0) {
        setAttendanceList([]);
        return;
      }

      // Get unique user IDs efficiently
      const seenIds = new Set<string>();
      attendance.forEach(record => seenIds.add(record.user_id));
      const userIds = Array.from(seenIds);

      // Fetch user details using shared helper
      const usersMap = await fetchUsersDetails(userIds);

      // Combine attendance with user details
      const attendanceList: Attendance[] = attendance.map(record => {
        const user = usersMap.get(record.user_id);
        const fullName = user?.first_name && user?.last_name 
          ? `${user.first_name} ${user.last_name}` 
          : 'Unknown User';
          
        return {
          id: record.id,
          user_id: record.user_id,
          full_name: fullName,
          email: user?.email || 'Unknown Email',
          attended_at: record.attended_at
        };
      });

      setAttendanceList(attendanceList);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to fetch attendance data');
    } finally {
      setModalLoading(false);
    }
  }, [fetchUsersDetails]);

  const showRegistrations = useCallback((event: Event) => {
    setSelectedEvent(event);
    setAttendanceList([]); // Clear attendance data
    setModalVisible(true);
  }, []);

  const showAttendance = useCallback(async (event: Event) => {
    setSelectedEvent(event);
    setModalVisible(true);
    await fetchAttendance(event.id);
  }, [fetchAttendance]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setSelectedEvent(null);
    setAttendanceList([]);
  }, []);

  // Memoized render functions - use pre-computed values
  const renderEvent = useCallback((event: Event) => (
    <View key={event.id} style={styles.eventCard}>
      <Text style={styles.eventTitle}>{event.title}</Text>
      <Text style={styles.eventDetail}>Location: {event.location}</Text>
      <Text style={styles.eventDetail}>
        Start: {event.formattedStartTime}
      </Text>
      <Text style={styles.eventDetail}>
        End: {event.formattedEndTime}
      </Text>
      {event.is_registerable && typeof event.registrationCount === 'number' && (
        <TouchableOpacity onPress={() => showRegistrations(event)} style={styles.registrationButton}>
          <Text style={[styles.eventDetail, styles.registrationCount, styles.clickableText]}>
            👥 Registered: {event.registrationCount} member{event.registrationCount !== 1 ? 's' : ''} (Tap to view)
          </Text>
        </TouchableOpacity>
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
  ), [showRegistrations, cancelEvent]);

  const renderPastEvent = useCallback((event: Event) => (
    <TouchableOpacity key={event.id} style={styles.eventCard} onPress={() => showAttendance(event)}>
      <Text style={styles.eventTitle}>{event.title}</Text>
      <Text style={styles.eventDetail}>Location: {event.location}</Text>
      <Text style={styles.eventDetail}>
        Start: {event.formattedStartTime}
      </Text>
      <Text style={styles.eventDetail}>
        End: {event.formattedEndTime}
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
      <Text style={[styles.eventDetail, styles.clickableText]}>
        📋 Tap to view attendance
      </Text>
    </TouchableOpacity>
  ), [showAttendance]);

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

      <Text style={styles.sectionHeader}>Pending Approval ({categorizedEvents.pending.length})</Text>
      {categorizedEvents.pending.length === 0 ? (
        <Text style={styles.noEvents}>No pending events.</Text>
      ) : (
        categorizedEvents.pending.map(renderEvent)
      )}

      <Text style={styles.sectionHeader}>Approved Events ({categorizedEvents.approved.length})</Text>
      {categorizedEvents.approved.length === 0 ? (
        <Text style={styles.noEvents}>No approved events.</Text>
      ) : (
        categorizedEvents.approved.map(renderEvent)
      )}

      <Text style={styles.sectionHeader}>Denied Events ({categorizedEvents.denied.length})</Text>
      {categorizedEvents.denied.length === 0 ? (
        <Text style={styles.noEvents}>No denied events.</Text>
      ) : (
        categorizedEvents.denied.map(renderEvent)
      )}

      <Text style={styles.sectionHeader}>Past Events ({categorizedEvents.past.length})</Text>
      {categorizedEvents.past.length === 0 ? (
        <Text style={styles.noEvents}>No past events.</Text>
      ) : (
        categorizedEvents.past.map(renderPastEvent)
      )}

      {/* Modal for showing registrations/attendance */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedEvent?.title || 'Event Details'}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {modalLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#330066" />
                <Text>Loading...</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalScrollView}>
                {/* Show registrations for current events */}
                {selectedEvent?.registrations && selectedEvent.registrations.length > 0 && (
                  <>
                    <Text style={styles.modalSectionTitle}>
                      📋 Registered Members ({selectedEvent.registrations.length})
                    </Text>
                    {selectedEvent.registrations.map((registration, index) => (
                      <View key={registration.id} style={styles.listItem}>
                        <Text style={styles.memberName}>{registration.full_name}</Text>
                        <Text style={styles.memberEmail}>{registration.email}</Text>
                      </View>
                    ))}
                  </>
                )}
                
                {/* Show attendance for past events */}
                {attendanceList.length > 0 && (
                  <>
                    <Text style={styles.modalSectionTitle}>
                      ✅ Attended Members ({attendanceList.length})
                    </Text>
                    {attendanceList.map((attendance, index) => (
                      <View key={attendance.id} style={styles.listItem}>
                        <Text style={styles.memberName}>{attendance.full_name}</Text>
                        <Text style={styles.memberEmail}>{attendance.email}</Text>
                        <Text style={styles.memberDate}>
                          Attended: {formatDateTimeInEST(attendance.attended_at)}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
                
                {/* Show message when no data */}
                {selectedEvent?.registrations?.length === 0 && attendanceList.length === 0 && !modalLoading && (
                  <Text style={styles.noDataText}>
                    {selectedEvent?.registrations !== undefined 
                      ? 'No registrations yet' 
                      : 'No attendance recorded'}
                  </Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  
  // New styles for registration and attendance features
  registrationButton: {
    marginVertical: 4,
  },
  clickableText: {
    color: '#0038A8',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0038A8',
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  modalLoading: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0038A8',
    marginBottom: 12,
    marginTop: 8,
  },
  listItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0038A8',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  memberDate: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    paddingVertical: 40,
    fontStyle: 'italic',
  },
});
