import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { checkAuthentication, handleAuthenticationRedirect } from '../../lib/auth';
import { formatDateInEST } from '../../lib/dateUtils';
import { supabase } from '../../lib/supabase';
import { PointAppeal } from '../../types/account';

export default function PointAppealsAdmin() {
  const [appeals, setAppeals] = useState<PointAppeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('pending');
  const [selectedAppeal, setSelectedAppeal] = useState<PointAppeal | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchAppeals = useCallback(async () => {
    try {
      const authResult = await checkAuthentication();
      if (!authResult.isAuthenticated) {
        handleAuthenticationRedirect();
        return;
      }

      // Check if user is admin/president
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', authResult.user.id)
        .single();

      if (!userProfile || !['admin', 'president'].includes(userProfile.role)) {
        Alert.alert('Access Denied', 'You do not have permission to view this page.');
        return;
      }

      let query = supabase
        .from('point_appeal')
        .select(`
          *,
          events(id, title, start_time, point_value, point_type),
          user:users!point_appeal_user_id_fkey(first_name, last_name, pledge_class),
          reviewer:users!point_appeal_reviewed_by_fkey(first_name, last_name)
        `);

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching appeals:', error);
        Alert.alert('Error', 'Failed to load appeals. Please try again.');
        return;
      }

      setAppeals(data || []);
    } catch (error) {
      console.error('Error in fetchAppeals:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  }, [filter]);

  const handleAppealDecision = async (appealId: string, decision: 'approved' | 'denied') => {
    if (processing) return;

    setProcessing(true);

    try {
      const authResult = await checkAuthentication();
      if (!authResult.isAuthenticated) {
        handleAuthenticationRedirect();
        return;
      }

      const appeal = appeals.find(a => a.id === appealId);
      if (!appeal) {
        Alert.alert('Error', 'Appeal not found.');
        return;
      }

      // Update the appeal status
      const { error: updateError } = await supabase
        .from('point_appeal')
        .update({
          status: decision,
          admin_response: adminResponse.trim() || undefined,
          reviewed_by: authResult.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', appealId);

      if (updateError) {
        console.error('Error updating appeal:', updateError);
        Alert.alert('Error', 'Failed to update appeal. Please try again.');
        return;
      }

      // If approved, add the user to event_attendance
      if (decision === 'approved') {
        const { error: attendanceError } = await supabase
          .from('event_attendance')
          .insert({
            user_id: appeal.user_id,
            event_id: appeal.event_id,
            created_at: new Date().toISOString(),
            // Add a note that this was added via appeal
            notes: `Added via point appeal (Appeal ID: ${appealId})`,
          });

        if (attendanceError) {
          console.error('Error adding attendance:', attendanceError);
          // Don't fail the whole operation, but log it
          Alert.alert(
            'Partial Success',
            'Appeal was approved but there was an issue adding attendance. Please manually verify.'
          );
        }
      }

      Alert.alert(
        'Success',
        `Appeal has been ${decision}${decision === 'approved' ? ' and points awarded' : ''}.`
      );

      // Reset form and refresh data
      setAdminResponse('');
      setSelectedAppeal(null);
      await fetchAppeals();
    } catch (error) {
      console.error('Error processing appeal:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setProcessing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAppeals();
    setRefreshing(false);
  }, [fetchAppeals]);

  useEffect(() => {
    fetchAppeals().finally(() => setLoading(false));
  }, [fetchAppeals]);

  const renderAppealCard = ({ item: appeal }: { item: PointAppeal }) => (
    <View style={styles.appealCard}>
      <View style={styles.appealHeader}>
        <View style={styles.appealInfo}>
          <Text style={styles.appealTitle}>
            {appeal.user?.first_name} {appeal.user?.last_name}
          </Text>
          <Text style={styles.appealSubtitle}>
            {appeal.user?.pledge_class} • {appeal.event?.title}
          </Text>
          <Text style={styles.appealDate}>
            {formatDateInEST(appeal.created_at, { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          appeal.status === 'approved' && styles.statusApproved,
          appeal.status === 'denied' && styles.statusDenied,
          appeal.status === 'pending' && styles.statusPending,
        ]}>
          <Text style={[
            styles.statusText,
            appeal.status === 'approved' && styles.statusTextApproved,
            appeal.status === 'denied' && styles.statusTextDenied,
            appeal.status === 'pending' && styles.statusTextPending,
          ]}>
            {appeal.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.eventInfo}>
        Event: {appeal.event?.title} ({appeal.event?.point_value} points)
      </Text>
      <Text style={styles.eventDate}>
        Event Date: {appeal.event?.date ? 
          formatDateInEST(appeal.event.date, { month: 'short', day: 'numeric', year: 'numeric' }) : 
          'Unknown'
        }
      </Text>

      <Text style={styles.reasonLabel}>Reason:</Text>
      <Text style={styles.reasonText}>{appeal.appeal_reason}</Text>

      {appeal.picture_url && (
        <Text style={styles.pictureUrl}>
          📷 Picture: {appeal.picture_url}
        </Text>
      )}

      {appeal.admin_response && (
        <View style={styles.responseContainer}>
          <Text style={styles.responseLabel}>Admin Response:</Text>
          <Text style={styles.responseText}>{appeal.admin_response}</Text>
          {appeal.reviewer && (
            <Text style={styles.reviewerText}>
              - {appeal.reviewer.first_name} {appeal.reviewer.last_name}
            </Text>
          )}
        </View>
      )}

      {appeal.status === 'pending' && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.denyButton]}
            onPress={() => {
              setSelectedAppeal(appeal);
              Alert.alert(
                'Deny Appeal',
                'Are you sure you want to deny this appeal?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Deny', 
                    style: 'destructive',
                    onPress: () => handleAppealDecision(appeal.id, 'denied')
                  }
                ]
              );
            }}
          >
            <Text style={styles.denyButtonText}>Deny</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => {
              setSelectedAppeal(appeal);
              Alert.alert(
                'Approve Appeal',
                'This will approve the appeal and add the user to the event attendance. Are you sure?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Approve', 
                    onPress: () => handleAppealDecision(appeal.id, 'approved')
                  }
                ]
              );
            }}
          >
            <Text style={styles.approveButtonText}>Approve & Award Points</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Point Appeals Management</Text>
        
        <View style={styles.filterContainer}>
          {(['all', 'pending', 'approved', 'denied'] as const).map((filterOption) => (
            <TouchableOpacity
              key={filterOption}
              style={[
                styles.filterButton,
                filter === filterOption && styles.filterButtonActive
              ]}
              onPress={() => setFilter(filterOption)}
            >
              <Text style={[
                styles.filterButtonText,
                filter === filterOption && styles.filterButtonTextActive
              ]}>
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {selectedAppeal && (
        <View style={styles.responseInputContainer}>
          <Text style={styles.responseInputLabel}>
            Optional Response for {selectedAppeal.user?.first_name} {selectedAppeal.user?.last_name}:
          </Text>
          <TextInput
            style={styles.responseInput}
            placeholder="Add an optional response explaining your decision..."
            placeholderTextColor="#999"
            value={adminResponse}
            onChangeText={setAdminResponse}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={styles.clearResponseButton}
            onPress={() => {
              setSelectedAppeal(null);
              setAdminResponse('');
            }}
          >
            <Text style={styles.clearResponseButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={appeals}
        renderItem={renderAppealCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No {filter === 'all' ? '' : filter} appeals found.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E1E8ED',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  responseInputContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  responseInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  responseInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#F8F9FA',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  clearResponseButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E1E8ED',
    borderRadius: 6,
  },
  clearResponseButtonText: {
    fontSize: 12,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  appealCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  appealInfo: {
    flex: 1,
  },
  appealTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  appealSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  appealDate: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  statusApproved: {
    backgroundColor: '#d4edda',
  },
  statusDenied: {
    backgroundColor: '#f8d7da',
  },
  statusPending: {
    backgroundColor: '#fff3cd',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextApproved: {
    color: '#155724',
  },
  statusTextDenied: {
    color: '#721c24',
  },
  statusTextPending: {
    color: '#856404',
  },
  eventInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12,
  },
  pictureUrl: {
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 12,
    fontWeight: '500',
  },
  responseContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 18,
    marginBottom: 4,
  },
  reviewerText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  denyButton: {
    backgroundColor: '#dc3545',
  },
  approveButton: {
    backgroundColor: '#28a745',
  },
  denyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  approveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
