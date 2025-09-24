import { useRouter } from 'expo-router';
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
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { checkAuthentication, handleAuthenticationRedirect } from '../../lib/auth';
import { formatDateInEST } from '../../lib/dateUtils';
import { supabase } from '../../lib/supabase';
import { PointAppeal } from '../../types/account';

export default function PointAppealsManagement() {
  const [appeals, setAppeals] = useState<PointAppeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const fetchAppeals = useCallback(async () => {
    try {
      console.log('🔍 Testing president access...');
      const authResult = await checkAuthentication();
      if (!authResult.isAuthenticated) {
        console.log('❌ Authentication failed');
        handleAuthenticationRedirect();
        return;
      }

      console.log('✅ User authenticated:', authResult.user.id);

      // Check if user has admin/president access
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, first_name, last_name, user_id, officer_position, email')
        .eq('user_id', authResult.user.id)
        .single();

      console.log('👤 User data from DB:', userData);
      console.log('❌ DB Error:', userError);

      if (userError || !userData) {
        console.log('❌ Failed to fetch user data');
        Alert.alert('Access Error', 'Could not verify your permissions.');
        return;
      }

      if (!userData.role || !['admin', 'president'].includes(userData.role)) {
        console.log('❌ Insufficient permissions:', userData.role);
        Alert.alert('Access Denied', 'You do not have permission to access this page.');
        router.back();
        return;
      }

      console.log('✅ Access granted to', userData.role, 'user');

      // Fetch appeals with simplified joins to avoid foreign key issues
      const { data: appealsData, error: appealsError } = await supabase
        .from('point_appeal')
        .select(`
          id,
          user_id,
          event_id,
          appeal_reason,
          picture_url,
          status,
          admin_response,
          reviewed_by,
          created_at,
          reviewed_at
        `)
        .order('created_at', { ascending: false });

      if (appealsError) {
        console.error('Appeals fetch error:', appealsError);
        Alert.alert('Error', 'Could not load appeals. Please make sure the point_appeal table exists.');
        return;
      }

      // Fetch event and user details separately to avoid foreign key issues
      const eventIds = [...new Set(appealsData?.map(a => a.event_id) || [])];
      const userIds = [...new Set(appealsData?.map(a => a.user_id) || [])];
      const reviewerIds = [...new Set(appealsData?.map(a => a.reviewed_by).filter(Boolean) || [])];

      const [eventsResponse, usersResponse, reviewersResponse] = await Promise.all([
        eventIds.length > 0 ? supabase
          .from('events')
          .select('id, title, start_time, point_value, point_type')
          .in('id', eventIds) : { data: [], error: null },
        userIds.length > 0 ? supabase
          .from('users')
          .select('user_id, first_name, last_name, pledge_class')
          .in('user_id', userIds) : { data: [], error: null },
        reviewerIds.length > 0 ? supabase
          .from('users')
          .select('user_id, first_name, last_name')
          .in('user_id', reviewerIds) : { data: [], error: null }
      ]);

      // Create lookup maps
      const eventsMap = new Map(eventsResponse.data?.map(e => [e.id, e]) || []);
      const usersMap = new Map(usersResponse.data?.map(u => [u.user_id, u]) || []);
      const reviewersMap = new Map(reviewersResponse.data?.map(r => [r.user_id, r]) || []);

      // Combine the data
      const enrichedAppeals: PointAppeal[] = (appealsData || []).map(appeal => {
        const event = eventsMap.get(appeal.event_id);
        const user = usersMap.get(appeal.user_id);
        const reviewer = appeal.reviewed_by ? reviewersMap.get(appeal.reviewed_by) : null;

        return {
          ...appeal,
          event: event ? {
            id: event.id,
            title: event.title,
            date: event.start_time, // Map start_time to date
            host_name: 'N/A', // Not needed for appeals view
            point_value: event.point_value || 0,
            point_type: event.point_type || 'other',
          } : {
            id: appeal.event_id,
            title: 'Unknown Event',
            date: new Date().toISOString(),
            host_name: 'N/A',
            point_value: 0,
            point_type: 'other',
          },
          user: user ? {
            user_id: user.user_id,
            first_name: user.first_name || 'Unknown',
            last_name: user.last_name || 'User',
            pledge_class: user.pledge_class || 'Unknown',
          } : {
            user_id: appeal.user_id,
            first_name: 'Unknown',
            last_name: 'User',
            pledge_class: 'Unknown',
          },
          reviewer: reviewer ? {
            first_name: reviewer.first_name || 'Unknown',
            last_name: reviewer.last_name || 'Admin',
          } : undefined,
        };
      });

      setAppeals(enrichedAppeals);
    } catch (error) {
      console.error('Error in fetchAppeals:', error);
      Alert.alert('Error', 'An unexpected error occurred while loading appeals.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleAppealDecision = async (appealId: string, decision: 'approved' | 'denied', response?: string) => {
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
          admin_response: response || null,
          reviewed_by: authResult.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', appealId);

      if (updateError) {
        console.error('Appeal update error:', updateError);
        Alert.alert('Error', 'Could not update appeal status.');
        return;
      }

      // If approved, add the attendance record
      if (decision === 'approved') {
        const { error: attendanceError } = await supabase
          .from('event_attendance')
          .insert({
            user_id: appeal.user_id,
            event_id: appeal.event_id,
          });

        if (attendanceError) {
          console.error('Attendance insert error:', attendanceError);
          Alert.alert('Warning', 'Appeal approved but could not add attendance record. You may need to add it manually.');
        }
      }

      Alert.alert(
        'Success', 
        `Appeal ${decision}${decision === 'approved' ? ' and points awarded' : ''}.`
      );
      
      // Refresh the appeals list
      fetchAppeals();
    } catch (error) {
      console.error('Error in handleAppealDecision:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAppeals().finally(() => setRefreshing(false));
  }, [fetchAppeals]);

  useEffect(() => {
    fetchAppeals();
  }, [fetchAppeals]);

  const filteredAppeals = appeals.filter(appeal => {
    const matchesFilter = filter === 'all' || appeal.status === filter;
    const matchesSearch = searchQuery === '' || 
      appeal.user?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appeal.user?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appeal.event?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const renderFilterButton = (filterValue: typeof filter, label: string, count: number) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterValue && styles.activeFilterButton
      ]}
      onPress={() => setFilter(filterValue)}
    >
      <Text style={[
        styles.filterButtonText,
        filter === filterValue && styles.activeFilterButtonText
      ]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const renderAppealItem = ({ item }: { item: PointAppeal }) => (
    <View style={styles.appealCard}>
      <View style={styles.appealHeader}>
        <Text style={styles.userName}>
          {item.user?.first_name} {item.user?.last_name}
        </Text>
        <View style={[
          styles.statusBadge,
          item.status === 'approved' && styles.approvedBadge,
          item.status === 'denied' && styles.deniedBadge,
          item.status === 'pending' && styles.pendingBadge,
        ]}>
          <Text style={[
            styles.statusText,
            item.status === 'approved' && styles.approvedText,
            item.status === 'denied' && styles.deniedText,
            item.status === 'pending' && styles.pendingText,
          ]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.eventTitle}>{item.event?.title}</Text>
      <Text style={styles.eventDate}>
        {formatDateInEST(item.event?.date || '', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        })} • {item.event?.point_value} points
      </Text>

      <Text style={styles.reasonLabel}>Reason:</Text>
      <Text style={styles.reasonText}>{item.appeal_reason}</Text>

      {item.picture_url && (
        <Text style={styles.pictureNote}>📷 Picture attached</Text>
      )}

      <Text style={styles.submittedDate}>
        Submitted: {formatDateInEST(item.created_at, { 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit' 
        })}
      </Text>

      {item.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => {
              Alert.prompt(
                'Approve Appeal',
                'Optional response to user:',
                (response) => handleAppealDecision(item.id, 'approved', response),
                'plain-text'
              );
            }}
          >
            <Text style={styles.actionButtonText}>✓ Approve</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.denyButton]}
            onPress={() => {
              Alert.prompt(
                'Deny Appeal',
                'Reason for denial:',
                (response) => {
                  if (response && response.trim()) {
                    handleAppealDecision(item.id, 'denied', response);
                  } else {
                    Alert.alert('Error', 'Please provide a reason for denial.');
                  }
                },
                'plain-text'
              );
            }}
          >
            <Text style={styles.actionButtonText}>✗ Deny</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status !== 'pending' && (
        <View style={styles.reviewInfo}>
          {item.reviewer && (
            <Text style={styles.reviewerText}>
              Reviewed by: {item.reviewer.first_name} {item.reviewer.last_name}
            </Text>
          )}
          {item.admin_response && (
            <>
              <Text style={styles.responseLabel}>Admin Response:</Text>
              <Text style={styles.responseText}>{item.admin_response}</Text>
            </>
          )}
          {item.reviewed_at && (
            <Text style={styles.reviewDate}>
              {formatDateInEST(item.reviewed_at, { 
                month: 'short', 
                day: 'numeric', 
                hour: 'numeric', 
                minute: '2-digit' 
              })}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading appeals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Point Appeals</Text>
        <Text style={styles.subtitle}>Review and manage member point appeals</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by name or event..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#9CA3AF"
      />

      <View style={styles.filterContainer}>
        {renderFilterButton('pending', 'Pending', appeals.filter(a => a.status === 'pending').length)}
        {renderFilterButton('approved', 'Approved', appeals.filter(a => a.status === 'approved').length)}
        {renderFilterButton('denied', 'Denied', appeals.filter(a => a.status === 'denied').length)}
        {renderFilterButton('all', 'All', appeals.length)}
      </View>

      <FlatList
        data={filteredAppeals}
        renderItem={renderAppealItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filter === 'all' ? 'No appeals found' : `No ${filter} appeals`}
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
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  searchInput: {
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    fontSize: 16,
    color: '#374151',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  activeFilterButton: {
    backgroundColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  appealCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  approvedBadge: {
    backgroundColor: '#D1FAE5',
  },
  deniedBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  pendingText: {
    color: '#92400E',
  },
  approvedText: {
    color: '#065F46',
  },
  deniedText: {
    color: '#991B1B',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  pictureNote: {
    fontSize: 14,
    color: Colors.primary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  submittedDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  denyButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  reviewInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  reviewerText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
