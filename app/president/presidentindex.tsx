import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { AccountDeletionService } from '../../lib/accountDeletion';
import { formatDateInEST } from '../../lib/dateUtils';

type Feedback = {
  id: string;
  submitted_at: string;
  subject: string;
  message: string;
  user_id: string;
  user_name?: string;
  status: string;
};

// Enhanced type with pre-computed fields
interface EnrichedFeedback extends Feedback {
  formattedDate?: string;
}

// State management with useReducer
interface FeedbackState {
  feedbacks: EnrichedFeedback[];
  loading: boolean;
  showResolved: boolean;
  accountDeletionModalVisible: boolean;
  deletionConfirmationText: string;
  isDeletingAccount: boolean;
}

type FeedbackAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_FEEDBACKS'; payload: EnrichedFeedback[] }
  | { type: 'TOGGLE_SHOW_RESOLVED' }
  | { type: 'SET_SHOW_RESOLVED'; payload: boolean }
  | { type: 'SET_ACCOUNT_MODAL'; payload: boolean }
  | { type: 'SET_DELETION_TEXT'; payload: string }
  | { type: 'SET_DELETING'; payload: boolean };

function feedbackReducer(state: FeedbackState, action: FeedbackAction): FeedbackState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_FEEDBACKS':
      return { ...state, feedbacks: action.payload, loading: false };
    
    case 'TOGGLE_SHOW_RESOLVED':
      return { ...state, showResolved: !state.showResolved };
    
    case 'SET_SHOW_RESOLVED':
      return { ...state, showResolved: action.payload };
    
    case 'SET_ACCOUNT_MODAL':
      return { ...state, accountDeletionModalVisible: action.payload };
    
    case 'SET_DELETION_TEXT':
      return { ...state, deletionConfirmationText: action.payload };
    
    case 'SET_DELETING':
      return { ...state, isDeletingAccount: action.payload };
    
    default:
      return state;
  }
}

// Pre-compute formatting for all feedbacks (runs once)
const precomputeFeedbackData = (feedbacks: Feedback[]): EnrichedFeedback[] => {
  return feedbacks.map((feedback) => ({
    ...feedback,
    formattedDate: formatDateInEST(feedback.submitted_at, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }),
  }));
};

export default function PresidentHome() {
  const [state, dispatch] = useReducer(feedbackReducer, {
    feedbacks: [],
    loading: true,
    showResolved: false,
    accountDeletionModalVisible: false,
    deletionConfirmationText: '',
    isDeletingAccount: false,
  });
  
  const router = useRouter();
  const hasCheckedAccess = useRef(false);

  const fetchFeedbacks = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

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
        dispatch({ type: 'SET_LOADING', payload: false });
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

      if (!state.showResolved) {
        query = query.neq('status', 'resolved');
      }

      const { data: rawFeedbackData, error: feedbackError } = await query.order('submitted_at', { ascending: false });

      if (feedbackError) {
        Alert.alert('Database Error', 'Unable to load feedback data.');
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      if (!rawFeedbackData || rawFeedbackData.length === 0) {
        dispatch({ type: 'SET_FEEDBACKS', payload: [] });
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

      // Pre-compute all formatted data
      const processedFeedbacks = precomputeFeedbackData(formattedFeedbacks);
      dispatch({ type: 'SET_FEEDBACKS', payload: processedFeedbacks });

    } catch (error: any) {
      Alert.alert('Error', 'Failed to load feedback data.');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [router, state.showResolved]);

  // Effect to fetch feedbacks on mount and when filter changes
  useEffect(() => {
    if (!hasCheckedAccess.current) {
      hasCheckedAccess.current = true;
      fetchFeedbacks();
    }
  }, [fetchFeedbacks]);

  useEffect(() => {
    if (hasCheckedAccess.current) {
      fetchFeedbacks();
    }
  }, [state.showResolved, fetchFeedbacks]);

  const markAsResolved = useCallback(async (feedbackId: string) => {
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
  }, [fetchFeedbacks]);

  const markAsPending = useCallback(async (feedbackId: string) => {
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
  }, [fetchFeedbacks]);

  const deleteFeedback = useCallback(async (feedbackId: string) => {
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
  }, [fetchFeedbacks]);

  // Account deletion handlers
  const handleAccountDeletion = useCallback(() => {
    dispatch({ type: 'SET_ACCOUNT_MODAL', payload: true });
  }, []);

  const confirmAccountDeletion = useCallback(async () => {
    if (state.deletionConfirmationText !== 'DELETE MY ACCOUNT') {
      Alert.alert('Confirmation Required', 'Please type "DELETE MY ACCOUNT" to confirm.');
      return;
    }

    dispatch({ type: 'SET_DELETING', payload: true });

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
                dispatch({ type: 'SET_ACCOUNT_MODAL', payload: false });
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
      dispatch({ type: 'SET_DELETING', payload: false });
      dispatch({ type: 'SET_DELETION_TEXT', payload: '' });
    }
  }, [state.deletionConfirmationText, router]);

  // Destructure state
  const { feedbacks, loading, showResolved, accountDeletionModalVisible, deletionConfirmationText, isDeletingAccount } = state;

  // Memoize filter counts
  const filterCounts = useMemo(() => ({
    pending: feedbacks.filter((f) => f.status !== 'resolved').length,
    resolved: feedbacks.filter((f) => f.status === 'resolved').length,
  }), [feedbacks]);

  // Memoized render function
  const renderFeedbackItem = useCallback(({ item }: { item: EnrichedFeedback }) => (
    <View style={styles.feedbackCard}>
      <View style={styles.feedbackHeader}>
        <Text style={styles.feedbackSubject}>{item.subject}</Text>
        <Text style={[
          styles.statusBadge,
          item.status === 'resolved' ? styles.resolvedBadge : styles.pendingBadge
        ]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
      
      <Text style={styles.feedbackMeta}>
        From: {item.user_name} • {item.formattedDate}
      </Text>
      
      <Text style={styles.feedbackMessage}>{item.message}</Text>
      
      <View style={styles.actionButtons}>
        {item.status === 'pending' ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.resolveButton]}
            onPress={() => markAsResolved(item.id)}
          >
            <Text style={styles.actionButtonText}>Mark Resolved</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.pendingButton]}
            onPress={() => markAsPending(item.id)}
          >
            <Text style={styles.actionButtonText}>Mark Pending</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteFeedback(item.id)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [markAsResolved, markAsPending, deleteFeedback]);

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
              onPress={() => dispatch({ type: 'SET_SHOW_RESOLVED', payload: false })}
            >
              <Text style={[styles.filterButtonText, !showResolved && styles.activeFilterText]}>
                Pending ({filterCounts.pending})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, showResolved && styles.activeFilter]}
              onPress={() => dispatch({ type: 'SET_SHOW_RESOLVED', payload: true })}
            >
              <Text style={[styles.filterButtonText, showResolved && styles.activeFilterText]}>
                Resolved ({filterCounts.resolved})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={feedbacks}
          renderItem={renderFeedbackItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.feedbackList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {showResolved ? 'No resolved feedback found.' : 'No pending feedback found.'}
              </Text>
            </View>
          }
          // Performance optimizations
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={true}
          initialNumToRender={6}
          updateCellsBatchingPeriod={50}
        />

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
      onRequestClose={() => dispatch({ type: 'SET_ACCOUNT_MODAL', payload: false })}
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
            onChangeText={(text) => dispatch({ type: 'SET_DELETION_TEXT', payload: text })}
            placeholder="Type here to confirm..."
            autoCapitalize="characters"
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                dispatch({ type: 'SET_ACCOUNT_MODAL', payload: false });
                dispatch({ type: 'SET_DELETION_TEXT', payload: '' });
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
