import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#330066" />
        <Text style={styles.loadingText}>Loading feedback...</Text>
      </View>
    );
  }

  return (
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
    </View>
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
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
