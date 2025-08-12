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
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

function generateRandomCode(length = 5) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Red flag detection functions
const detectRedFlags = (event: any, allEvents: any[]) => {
  const flags: Array<{
    type: 'error' | 'warning' | 'info';
    icon: string;
    message: string;
    details?: string;
  }> = [];

  // Missing information flags
  if (!event.description || event.description.trim() === '') {
    flags.push({
      type: 'warning',
      icon: '📝',
      message: 'Missing Description',
      details: 'Event lacks a detailed description for members'
    });
  }

  if (!event.location || event.location.trim() === '') {
    flags.push({
      type: 'error',
      icon: '📍',
      message: 'Missing Location',
      details: 'Event must have a location specified'
    });
  }

  // Time-related flags
  const eventStart = new Date(event.start_time);
  const eventEnd = new Date(event.end_time);
  const now = new Date();

  if (eventStart >= eventEnd) {
    flags.push({
      type: 'error',
      icon: '⏰',
      message: 'Invalid Time Range',
      details: 'Event start time must be before end time'
    });
  }

  if (eventStart < now) {
    flags.push({
      type: 'error',
      icon: '📅',
      message: 'Past Event',
      details: 'Event is scheduled in the past'
    });
  }

  // Check for overlapping events
  const overlappingEvents = allEvents.filter(otherEvent => {
    if (otherEvent.id === event.id) return false;
    
    const otherStart = new Date(otherEvent.start_time);
    const otherEnd = new Date(otherEvent.end_time);
    
    return (eventStart < otherEnd && eventEnd > otherStart);
  });

  if (overlappingEvents.length > 0) {
    overlappingEvents.forEach(otherEvent => {
      const otherStart = new Date(otherEvent.start_time);
      flags.push({
        type: 'warning',
        icon: '⚠️',
        message: 'Time Conflict',
        details: `Overlaps with "${otherEvent.title}" (${otherStart.toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })})`
      });
    });
  }

  // Pledge-related flags
  if (event.available_to_pledges) {
    flags.push({
      type: 'info',
      icon: '👥',
      message: 'Available to Pledges',
      details: 'This event is open to pledge class participation'
    });
  }

  // Point-related flags
  if (event.point_value === 0 && event.point_type !== 'No Point') {
    flags.push({
      type: 'warning',
      icon: '🎯',
      message: 'Zero Points',
      details: 'Event has no point value but has a point type'
    });
  }

  // Registration flags
  if (event.is_registerable) {
    const registrationDeadline = new Date(eventStart);
    registrationDeadline.setHours(registrationDeadline.getHours() - 24);
    
    if (now > registrationDeadline) {
      flags.push({
        type: 'warning',
        icon: '📝',
        message: 'Late Registration',
        details: 'Less than 24 hours for member registration'
      });
    }
  }

  return flags;
};

export default function ConfirmEventsScreen() {
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  const fetchPendingEvents = async () => {
    try {
      setLoading(true);
      
      // Get pending events with creator info
      const { data: pendingData, error: pendingError } = await supabase
        .from('events')
        .select(`
          *,
          created_by_user:created_by(first_name, last_name)
        `)
        .eq('status', 'pending')
        .order('start_time', { ascending: true });

      if (pendingError) {
        console.error('Error fetching pending events:', pendingError);
        Alert.alert('Database Error', pendingError.message);
        return;
      }

      // Get all events for conflict detection
      const { data: allData, error: allError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_time,
          end_time,
          status
        `)
        .order('start_time', { ascending: true });

      if (allError) {
        console.error('Error fetching all events:', allError);
      }

      setPendingEvents(pendingData || []);
      setAllEvents(allData || []);
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
            text: 'Deny',
            style: 'destructive',
            onPress: (note) => {
              if (note && note.trim()) {
                submitDenial(eventId, note);
              } else {
                Alert.alert('Error', 'Please provide a note for denial.');
              }
            }
          }
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
      Alert.alert('Success', 'Event denied successfully.');
      fetchPendingEvents();
    }
  };

  const renderEventCard = ({ item }: { item: any }) => {
    const start = new Date(item.start_time);
    const end = new Date(item.end_time);
    const redFlags = detectRedFlags(item, allEvents);
    const hasErrors = redFlags.some(flag => flag.type === 'error');
    const hasWarnings = redFlags.some(flag => flag.type === 'warning');
    const creatorName = item.created_by_user 
      ? `${item.created_by_user.first_name} ${item.created_by_user.last_name}`
      : 'Unknown';

    return (
      <View style={styles.eventCard}>
        {/* Event Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.dateColumn}>
            <Text style={styles.dateMonth}>
              {start.toLocaleDateString([], { month: 'short' }).toUpperCase()}
            </Text>
            <Text style={styles.dateDay}>
              {start.getDate()}
            </Text>
            <Text style={styles.dateWeekday}>
              {start.toLocaleDateString([], { weekday: 'short' })}
            </Text>
          </View>
          
          <View style={styles.eventInfo}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
              <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, 
                  hasErrors ? styles.statusError : 
                  hasWarnings ? styles.statusWarning : styles.statusPending
                ]}>
                  <Text style={[styles.statusText,
                    hasErrors ? styles.statusTextError : 
                    hasWarnings ? styles.statusTextWarning : styles.statusTextPending
                  ]}>
                    {hasErrors ? '🔴 REQUIRES ATTENTION' : hasWarnings ? '🟡 REVIEW NEEDED' : '🟢 READY FOR REVIEW'}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.eventMeta}>
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>📍</Text>
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.location || 'Location TBD'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>⏰</Text>
                <Text style={styles.metaText}>
                  {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {' '}
                  {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>👤</Text>
                <Text style={styles.metaText}>Created by {creatorName}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Event Details */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Event Details</Text>
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{item.event_type || 'Not specified'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Points</Text>
              <Text style={styles.detailValue}>
                {item.point_value || 0} {item.point_type || 'points'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Registration</Text>
              <Text style={styles.detailValue}>
                {item.is_registerable ? 'Required' : 'Not required'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Pledges</Text>
              <Text style={styles.detailValue}>
                {item.available_to_pledges ? 'Allowed' : 'Brothers only'}
              </Text>
            </View>
          </View>
          
          {item.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.descriptionText}>{item.description}</Text>
            </View>
          )}
        </View>

        {/* Quality Assurance Issues */}
        {redFlags.length > 0 && (
          <View style={styles.flagsSection}>
            <Text style={styles.redFlagsTitle}>
              Quality Assurance Issues ({redFlags.length})
            </Text>
            {redFlags.map((flag, index) => (
              <View key={index} style={[
                styles.flagItem,
                flag.type === 'error' && styles.flagError,
                flag.type === 'warning' && styles.flagWarning,
                flag.type === 'info' && styles.flagInfo
              ]}>
                <Text style={styles.flagIcon}>{flag.icon}</Text>
                <View style={styles.flagContent}>
                  <Text style={[
                    styles.flagMessage,
                    flag.type === 'error' && styles.flagMessageError,
                    flag.type === 'warning' && styles.flagMessageWarning,
                    flag.type === 'info' && styles.flagMessageInfo
                  ]}>
                    {flag.message}
                  </Text>
                  {flag.details && (
                    <Text style={styles.flagDetails}>{flag.details}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.denyButton]}
            onPress={() => denyEvent(item.id)}
          >
            <Text style={styles.denyButtonText}>Deny Event</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => approveEvent(item.id)}
          >
            <Text style={styles.approveButtonText}>Approve Event</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading pending events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Event Confirmation</Text>
        <Text style={styles.subtitle}>
          {pendingEvents.length} event{pendingEvents.length !== 1 ? 's' : ''} awaiting review
        </Text>
      </View>

      {pendingEvents.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptyMessage}>
            No events are currently pending approval. Check back later or encourage brothers to submit events.
          </Text>
        </View>
      ) : (
        <FlatList
          data={pendingEvents}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Header
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },

  // List
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },

  // Event Card
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  // Hero Section
  heroSection: {
    flexDirection: 'row',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  dateColumn: {
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginRight: 20,
    minWidth: 70,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 2,
  },
  dateWeekday: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  eventInfo: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 16,
    lineHeight: 28,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  statusPending: {
    backgroundColor: '#FFF3F0',
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  statusWarning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  statusError: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusTextPending: {
    color: '#FF6B35',
  },
  statusTextWarning: {
    color: '#D97706',
  },
  statusTextError: {
    color: '#DC2626',
  },

  // Meta info
  eventMeta: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },

  // Details Section
  detailsSection: {
    padding: 24,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  descriptionContainer: {
    marginTop: 8,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    fontWeight: '400',
  },

  // Red Flags Section
  flagsSection: {
    padding: 24,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  redFlagsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  flagItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  flagError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  flagWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FED7AA',
  },
  flagInfo: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  flagIcon: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
  },
  flagContent: {
    flex: 1,
  },
  flagMessage: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  flagMessageError: {
    color: '#DC2626',
  },
  flagMessageWarning: {
    color: '#D97706',
  },
  flagMessageInfo: {
    color: '#2563EB',
  },
  flagDetails: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // Action Section
  actionSection: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingTop: 0,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  denyButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  approveButton: {
    backgroundColor: '#FF6B35',
  },
  denyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },
});
