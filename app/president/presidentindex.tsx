import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { AccountDeletionService } from '../../lib/accountDeletion';

type Feedback = {
  id: string;
  submitted_at: string;
  subject: string;
  message: string;
  user_id: string;
  user_name?: string;
  status: string;
};

export default function PresidentHome() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const router = useRouter();
  
  // Account deletion states
  const [accountDeletionModalVisible, setAccountDeletionModalVisible] = useState(false);
  const [deletionConfirmationText, setDeletionConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [showResolved]);

  const fetchFeedbacks = async () => {
    setLoading(true);

    try {
      // Check authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      // Verify user role
      const { data: userData, error: userDbError } = await supabase
        .from('users')
        .select('user_id, role, officer_position, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      if (userDbError || !userData) {
        Alert.alert('Access Error', 'Could not verify user permissions.');
        setLoading(false);
        return;
      }

      if (userData.role !== 'admin') {
        Alert.alert('Access Denied', 'Admin role required.');
        router.replace('/(tabs)');
        return;
      }

      // Query feedback data
      let query = supabase
        .from('admin_feedback')
        .select('id, submitted_at, subject, message, user_id, status');

      if (!showResolved) {
        query = query.neq('status', 'resolved');
      }

      const { data: rawFeedbackData, error: feedbackError } = await query.order('submitted_at', { ascending: false });

      if (feedbackError) {
        Alert.alert('Database Error', 'Unable to load feedback data.');
        setLoading(false);
        return;
      }

      if (!rawFeedbackData || rawFeedbackData.length === 0) {
        setFeedbacks([]);
        setLoading(false);
        return;
      }

      // Get user names
      const userIds = [...new Set(rawFeedbackData.map(fb => fb.user_id))];
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      // Format feedback with user names
      const formattedFeedbacks: Feedback[] = rawFeedbackData.map((fb: any) => ({
        id: fb.id,
        submitted_at: fb.submitted_at,
        subject: fb.subject,
        message: fb.message,
        user_id: fb.user_id,
        status: fb.status,
        user_name: (() => {
          const userData = usersData?.find(u => u.user_id === fb.user_id);
          return userData?.first_name && userData?.last_name 
            ? `${userData.first_name} ${userData.last_name}` 
            : 'Unknown User';
        })()
      }));

      setFeedbacks(formattedFeedbacks);
      setLoading(false);

    } catch (error: any) {
      Alert.alert('Error', 'Failed to load feedback data.');
      setLoading(false);
    }
  };

  const markAsResolved = async (feedbackId: string) => {
    try {
      const { error } = await supabase
        .from('admin_feedback')
        .update({ 
          status: 'resolved',
          responded_at: new Date().toISOString()
        })
        .eq('id', feedbackId);

      if (error) {
        Alert.alert('Error', 'Failed to update feedback status.');
        return;
      }

      Alert.alert('Success', 'Feedback marked as resolved.');
      fetchFeedbacks();
    } catch (error) {
      Alert.alert('Error', 'Failed to update feedback status.');
    }
  };

  const markAsPending = async (feedbackId: string) => {
    try {
      const { error } = await supabase
        .from('admin_feedback')
        .update({ 
          status: 'pending',
          responded_at: null
        })
        .eq('id', feedbackId);

      if (error) {
        Alert.alert('Error', 'Failed to update feedback status.');
        return;
      }

      Alert.alert('Success', 'Feedback marked as pending.');
      fetchFeedbacks();
    } catch (error) {
      Alert.alert('Error', 'Failed to update feedback status.');
    }
  };

  const deleteFeedback = async (feedbackId: string) => {
    Alert.alert(
      'Delete Feedback',
      'Are you sure you want to permanently delete this feedback?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('admin_feedback')
                .delete()
                .eq('id', feedbackId);

              if (error) {
                Alert.alert('Error', 'Failed to delete feedback.');
                return;
              }

              Alert.alert('Success', 'Feedback deleted successfully.');
              fetchFeedbacks();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete feedback.');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Account deletion handlers
  const handleAccountDeletion = async () => {
    setAccountDeletionModalVisible(true);
  };

  const confirmAccountDeletion = async () => {
    if (deletionConfirmationText !== 'DELETE MY ACCOUNT') {
      Alert.alert('Confirmation Required', 'Please type "DELETE MY ACCOUNT" to confirm.');
      return;
    }

    setIsDeletingAccount(true);

    try {
      // Check authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      // Call the account deletion service
      const result = await AccountDeletionService.deleteAccount(user.id);

      if (result.success) {
        Alert.alert(
          'Account Deleted',
          result.message,
          [
            {
              text: 'OK',
              onPress: () => {
                setAccountDeletionModalVisible(false);
                router.replace('/(auth)/login');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Account deletion error:', error);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
      setIsDeletingAccount(false);
      setDeletionConfirmationText('');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#330066" />
        <Text style={styles.loadingText}>Loading feedback...</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Member Feedback</Text>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, !showResolved && styles.activeFilter]}
            onPress={() => setShowResolved(false)}
          >
            <Text style={[styles.filterButtonText, !showResolved && styles.activeFilterText]}>
              Pending ({feedbacks.filter(f => f.status !== 'resolved').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, showResolved && styles.activeFilter]}
            onPress={() => setShowResolved(true)}
          >
            <Text style={[styles.filterButtonText, showResolved && styles.activeFilterText]}>
              Resolved ({feedbacks.filter(f => f.status === 'resolved').length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.feedbackList}>
        {feedbacks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {showResolved ? 'No resolved feedback found.' : 'No pending feedback found.'}
            </Text>
          </View>
        ) : (
          feedbacks.map((feedback) => (
            <View key={feedback.id} style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                <Text style={styles.feedbackSubject}>{feedback.subject}</Text>
                <Text style={[
                  styles.statusBadge,
                  feedback.status === 'resolved' ? styles.resolvedBadge : styles.pendingBadge
                ]}>
                  {feedback.status.toUpperCase()}
                </Text>
              </View>
              
              <Text style={styles.feedbackMeta}>
                From: {feedback.user_name} • {formatDate(feedback.submitted_at)}
              </Text>
              
              <Text style={styles.feedbackMessage}>{feedback.message}</Text>
              
              <View style={styles.actionButtons}>
                {feedback.status === 'pending' ? (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.resolveButton]}
                    onPress={() => markAsResolved(feedback.id)}
                  >
                    <Text style={styles.actionButtonText}>Mark Resolved</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.pendingButton]}
                    onPress={() => markAsPending(feedback.id)}
                  >
                    <Text style={styles.actionButtonText}>Mark Pending</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteFeedback(feedback.id)}
                >
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Account Management Section */}
      <View style={styles.accountSection}>
        <Text style={styles.accountSectionTitle}>Account Management</Text>
        <TouchableOpacity 
          style={styles.deleteAccountButton}
          onPress={handleAccountDeletion}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </View>

    {/* Account Deletion Modal */}
    <Modal
      visible={accountDeletionModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setAccountDeletionModalVisible(false)}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Delete Account</Text>
          
          <Text style={styles.modalText}>
            This action is permanent and cannot be undone. All your data will be deleted within 30 days.
          </Text>
          
          <Text style={styles.modalInstructions}>
            To confirm, type "DELETE MY ACCOUNT" below:
          </Text>
          
          <TextInput
            style={styles.confirmationInput}
            value={deletionConfirmationText}
            onChangeText={setDeletionConfirmationText}
            placeholder="Type here to confirm..."
            autoCapitalize="characters"
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setAccountDeletionModalVisible(false);
                setDeletionConfirmationText('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.deleteButton, isDeletingAccount && styles.disabledButton]}
              onPress={confirmAccountDeletion}
              disabled={isDeletingAccount}
            >
              <Text style={styles.deleteButtonText}>
                {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#330066',
    marginBottom: 15,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeFilter: {
    backgroundColor: '#330066',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  activeFilterText: {
    color: 'white',
  },
  feedbackList: {
    flex: 1,
    padding: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  feedbackCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackSubject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#330066',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  pendingBadge: {
    backgroundColor: '#FFF3CD',
    color: '#856404',
  },
  resolvedBadge: {
    backgroundColor: '#D4EDDA',
    color: '#155724',
  },
  feedbackMeta: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  feedbackMessage: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  resolveButton: {
    backgroundColor: '#28a745',
  },
  pendingButton: {
    backgroundColor: '#ffc107',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Account Management Styles
  accountSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  accountSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  deleteAccountButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteAccountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modal Styles
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
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  modalInstructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
