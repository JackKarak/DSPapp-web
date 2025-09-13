import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';

// EST timezone helper
const formatDateInEST = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function ScholarshipTab() {
  const [loading, setLoading] = useState(true);
  const [testBankItems, setTestBankItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }      // Check if user is VP Scholarship
      const { data: userData, error: roleError } = await supabase
        .from('users')
        .select('officer_position')
        .eq('user_id', user.id)
        .single();      if (roleError) {
        console.error('Role check error:', roleError);
        Alert.alert('Error', 'Failed to verify your permissions. Please try again.');
        setLoading(false);
        return;
      }

      if (!userData) {
        Alert.alert('Error', 'User data not found. Please contact support.');
        setLoading(false);
        return;
      }

      if (!userData.officer_position) {
        Alert.alert('Access Denied', 'You do not have officer permissions.');
        router.replace('/officer/' as any);
        return;
      }

      // Allow access for VP Scholarship or scholarship officers
      const validPositions = ['scholarship', 'vp_scholarship', 'president'];
      if (!validPositions.includes(userData.officer_position)) {
        Alert.alert('Access Denied', 'You do not have permission to access the scholarship test bank.');
        router.replace('/officer/' as any);
        return;
      }      fetchTestBankItems();
    } catch (error) {
      console.error('Authentication check failed:', error);
      Alert.alert('Error', 'Authentication check failed. Please try again.');
      setLoading(false);
    }
  };

  const fetchTestBankItems = async () => {
    try {      const { data, error } = await supabase
        .from('test_bank')
        .select(`
          id,
          class_code,
          file_type,
          file_name,
          uploaded_at,
          submitted_by,
          status,
          users:submitted_by(first_name, last_name)
        `)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching test bank:', error);
        
        // Check if it's a table not found error
        if (error.message?.includes('test_bank') && error.message?.includes('does not exist')) {          // Set mock data for development/testing
          setTestBankItems([]);
        } else {
          Alert.alert('Database Error', `Failed to load test bank items: ${error.message}\n\nThis feature requires database setup. Contact your system administrator.`);
          setTestBankItems([]);
        }
      } else {        setTestBankItems(data || []);
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred while loading test bank items.');
      setTestBankItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item: any) => {
    setSelectedItem(item);
    setDetailModalVisible(true);
  };

  const handleApproveSubmission = async (item: any) => {
    if (processingAction) return;
    
    Alert.alert(
      'Approve Submission',
      `Are you sure you want to approve this ${item.file_type} submission for ${item.class_code}? The user will receive a scholarship point.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Approve', 
          style: 'default',
          onPress: () => processSubmission(item, 'approved')
        }
      ]
    );
  };

  const handleDenySubmission = async (item: any) => {
    if (processingAction) return;
    
    Alert.alert(
      'Deny Submission',
      `Are you sure you want to deny this ${item.file_type} submission for ${item.class_code}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Deny', 
          style: 'destructive',
          onPress: () => processSubmission(item, 'rejected')
        }
      ]
    );
  };

  const processSubmission = async (item: any, newStatus: 'approved' | 'rejected') => {
    setProcessingAction(true);
    
    try {
      // Update the test bank item status
      const { error: updateError } = await supabase
        .from('test_bank')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (updateError) {
        throw updateError;
      }

      // If approved, award scholarship point
      if (newStatus === 'approved') {
        await awardScholarshipPoint(item);
      }

      Alert.alert(
        'Success', 
        `Submission ${newStatus === 'approved' ? 'approved' : 'denied'} successfully!${newStatus === 'approved' ? ' User has been awarded a scholarship point.' : ''}`
      );

      // Refresh the data
      fetchTestBankItems();
      setDetailModalVisible(false);

    } catch (error: any) {
      console.error('Error processing submission:', error);
      Alert.alert('Error', `Failed to ${newStatus === 'approved' ? 'approve' : 'deny'} submission: ${error.message}`);
    } finally {
      setProcessingAction(false);
    }
  };

  const awardScholarshipPoint = async (item: any) => {
    try {
      // Create a scholarship point event for the user
      const pointEventTitle = `Test Bank Submission - ${item.class_code}`;
      
      // Check if we already created an event for this submission
      const { data: existingEvents } = await supabase
        .from('events')
        .select('id')
        .eq('title', pointEventTitle)
        .eq('created_by', item.submitted_by)
        .limit(1);

      let eventId;

      if (existingEvents && existingEvents.length > 0) {
        eventId = existingEvents[0].id;
      } else {
        // Create a new event for this submission
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .insert({
            title: pointEventTitle,
            description: `Approved ${item.file_type} submission for ${item.class_code}`,
            start_time: new Date().toISOString(),
            end_time: new Date().toISOString(),
            location: 'Test Bank',
            point_value: 1,
            point_type: 'scholarship',
            created_by: item.submitted_by,
            is_non_event: true,
            status: 'approved'
          })
          .select('id')
          .single();

        if (eventError) {
          throw eventError;
        }
        
        eventId = eventData.id;
      }

      // Check if attendance record already exists
      const { data: existingAttendance } = await supabase
        .from('event_attendance')
        .select('id')
        .eq('user_id', item.submitted_by)
        .eq('event_id', eventId)
        .limit(1);

      if (!existingAttendance || existingAttendance.length === 0) {
        // Add attendance record to award the point
        const { error: attendanceError } = await supabase
          .from('event_attendance')
          .insert({
            user_id: item.submitted_by,
            event_id: eventId,
            attended_at: new Date().toISOString()
          });

        if (attendanceError) {
          throw attendanceError;
        }
      }

    } catch (error) {
      console.error('Error awarding scholarship point:', error);
      // Don't throw here - the approval should still complete even if point award fails
      Alert.alert('Warning', 'Submission approved but failed to award point. Please check manually.');
    }
  };

  const filteredItems = testBankItems.filter(item => {
    if (statusFilter === 'all') return true;
    return item.status === statusFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#16a34a';
      case 'rejected': return '#dc2626';
      case 'pending': return '#d97706';
      default: return '#6b7280';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'approved': return '#dcfce7';
      case 'rejected': return '#fee2e2';
      case 'pending': return '#fef3c7';
      default: return '#f3f4f6';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading test bank...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
      <Text style={styles.header}>📚 Scholarship Test Bank</Text>
      <Text style={styles.subtitle}>Manage study materials and test resources</Text>

      {/* Status Filter */}
      {testBankItems.length > 0 && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter by Status:</Text>
          <View style={styles.filterButtons}>
            {[
              { key: 'all', label: 'All', count: testBankItems.length },
              { key: 'pending', label: 'Pending', count: testBankItems.filter(item => item.status === 'pending').length },
              { key: 'approved', label: 'Approved', count: testBankItems.filter(item => item.status === 'approved').length },
              { key: 'rejected', label: 'Rejected', count: testBankItems.filter(item => item.status === 'rejected').length }
            ].map(filter => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterButton,
                  statusFilter === filter.key && styles.activeFilterButton
                ]}
                onPress={() => setStatusFilter(filter.key)}
              >
                <Text style={[
                  styles.filterButtonText,
                  statusFilter === filter.key && styles.activeFilterButtonText
                ]}>
                  {filter.label} ({filter.count})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {testBankItems.length === 0 ? 'No test bank items yet' : `No ${statusFilter} items`}
          </Text>
          <Text style={styles.emptySubtext}>
            {testBankItems.length === 0 
              ? 'Submissions from members will appear here when they upload study materials through their account page.'
              : `There are no ${statusFilter} submissions to show.`
            }
          </Text>
          {testBankItems.length === 0 && (
            <Text style={styles.infoText}>
              💡 Brothers can submit tests, notes, and study materials by going to their Account tab and using the &quot;Submit to Test Bank&quot; feature.
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.itemsContainer}>
          {filteredItems.map((item: any) => (
            <TouchableOpacity
              key={item.id}
              style={styles.itemCard}
              onPress={() => handleItemPress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.classCode}>{item.class_code}</Text>
                <View style={styles.tagContainer}>
                  <Text style={styles.fileType}>{item.file_type}</Text>
                  <View style={[styles.statusTag, { backgroundColor: getStatusBgColor(item.status) }]}>
                    <Text style={[styles.statusTagText, { color: getStatusColor(item.status) }]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.fileName}>{item.file_name}</Text>
              <View style={styles.itemFooter}>
                <Text style={styles.uploadedBy}>
                  Uploaded by: {item.users?.first_name} {item.users?.last_name}
                </Text>
                <Text style={styles.uploadDate}>
                  {formatDateInEST(item.uploaded_at)}
                </Text>
              </View>
              <Text style={styles.tapHint}>Tap to review →</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Submission</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDetailModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView style={styles.modalScrollView}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Class Code</Text>
                  <Text style={styles.detailValue}>{selectedItem.class_code}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>File Type</Text>
                  <Text style={styles.detailValue}>{selectedItem.file_type}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>File Name</Text>
                  <Text style={styles.detailValue}>{selectedItem.file_name}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Submitted By</Text>
                  <Text style={styles.detailValue}>
                    {selectedItem.users?.first_name} {selectedItem.users?.last_name}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Upload Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedItem.uploaded_at).toLocaleDateString('en-US', {
                      timeZone: 'America/New_York',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Current Status</Text>
                  <View style={[styles.statusTag, { backgroundColor: getStatusBgColor(selectedItem.status) }]}>
                    <Text style={[styles.statusTagText, { color: getStatusColor(selectedItem.status) }]}>
                      {selectedItem.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {selectedItem.status === 'pending' && (
                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleApproveSubmission(selectedItem)}
                      disabled={processingAction}
                    >
                      <Text style={styles.actionButtonText}>
                        {processingAction ? 'Processing...' : '✓ Approve & Award Point'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.denyButton]}
                      onPress={() => handleDenySubmission(selectedItem)}
                      disabled={processingAction}
                    >
                      <Text style={[styles.actionButtonText, styles.denyButtonText]}>
                        {processingAction ? 'Processing...' : '✗ Deny'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {selectedItem.status === 'approved' && (
                  <View style={styles.statusInfo}>
                    <Text style={styles.statusInfoText}>
                      ✅ This submission has been approved and the user has received a scholarship point.
                    </Text>
                  </View>
                )}

                {selectedItem.status === 'rejected' && (
                  <View style={styles.statusInfo}>
                    <Text style={styles.statusInfoText}>
                      ❌ This submission has been denied.
                    </Text>
                  </View>
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
  // Filter styles
  filterContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeFilterButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeFilterButtonText: {
    color: '#fff',
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
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  itemsContainer: {
    gap: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tagContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  classCode: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  fileType: {
    fontSize: 14,
    color: Colors.primary,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '600',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fileName: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    fontWeight: '500',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadedBy: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  uploadDate: {
    fontSize: 14,
    color: '#9ca3af',
  },
  tapHint: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    fontStyle: 'italic',
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
    borderRadius: 20,
    padding: 24,
    maxHeight: '90%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  approveButton: {
    backgroundColor: '#16a34a',
  },
  denyButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dc2626',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  denyButtonText: {
    color: '#dc2626',
  },
  statusInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusInfoText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
});
