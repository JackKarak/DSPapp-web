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
  has_attachment?: boolean;
  file_name?: string;
};

export default function PresidentHome() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);

    try {
      // Check authentication first
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.log('Authentication failed:', userError);
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      console.log('Fetching admin feedback...');

      // First try with join, then fallback to separate queries
      let feedbackData: any[] = [];
      let hasError = false;

      // Try the join query first
      const joinResult = await supabase
        .from('admin_feedback')
        .select(`
          id,
          submitted_at,
          subject,
          message,
          user_id,
          status,
          has_attachment,
          file_name,
          users(first_name, last_name)
        `)
        .neq('status', 'resolved')
        .order('submitted_at', { ascending: false });

      if (joinResult.error) {
        console.log('Join query failed:', joinResult.error.message);
        console.log('Trying separate queries...');
        
        // Fallback: Get feedback without user join
        const basicResult = await supabase
          .from('admin_feedback')
          .select('id, submitted_at, subject, message, user_id, status, has_attachment, file_name')
          .neq('status', 'resolved')
          .order('submitted_at', { ascending: false });

        if (basicResult.error) {
          console.error('Basic query also failed:', basicResult.error);
          Alert.alert('Database Error', `Unable to access feedback table: ${basicResult.error.message}`);
          hasError = true;
        } else {
          // Get unique user IDs and fetch user names separately
          const userIds = [...new Set(basicResult.data.map(fb => fb.user_id))];
          const { data: usersData } = await supabase
            .from('users')
            .select('user_id, first_name, last_name')
            .in('user_id', userIds);

          // Combine the data
          feedbackData = basicResult.data.map((fb: any) => ({
            ...fb,
            users: {
              first_name: usersData?.find(u => u.user_id === fb.user_id)?.first_name,
              last_name: usersData?.find(u => u.user_id === fb.user_id)?.last_name,
            }
          }));
        }
      } else {
        feedbackData = joinResult.data || [];
      }

      if (hasError) {
        setLoading(false);
        return;
      }

      console.log('Feedback data loaded:', feedbackData?.length || 0, 'items');

      const formattedFeedbacks: Feedback[] = feedbackData.map((fb: any) => ({
        id: fb.id,
        submitted_at: fb.submitted_at,
        subject: fb.subject,
        message: fb.message,
        user_id: fb.user_id,
        status: fb.status,
        has_attachment: fb.has_attachment,
        file_name: fb.file_name,
        user_name: fb.users?.first_name && fb.users?.last_name 
          ? `${fb.users.first_name} ${fb.users.last_name}` 
          : 'Unknown User'
      }));

      setFeedbacks(formattedFeedbacks);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      Alert.alert('Unexpected Error', `Something went wrong: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const resolveFeedback = async (feedbackId: string) => {
    Alert.alert(
      'Resolve Feedback',
      'Are you sure you want to mark this feedback as resolved? This will remove it from the dashboard.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Resolve',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('admin_feedback')
                .update({ 
                  status: 'resolved',
                  responded_at: new Date().toISOString()
                })
                .eq('id', feedbackId);

              if (error) {
                console.error('Error resolving feedback:', error);
                Alert.alert('Error', 'Failed to resolve feedback. Please try again.');
                return;
              }

              // Remove the feedback from the local state
              setFeedbacks(prev => prev.filter(feedback => feedback.id !== feedbackId));
              
              Alert.alert('Success', 'Feedback has been resolved and removed from the dashboard.');
            } catch (error) {
              console.error('Unexpected error:', error);
              Alert.alert('Error', 'An unexpected error occurred. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading feedback...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={true}
    >
      <Text style={styles.header}>👑 Admin Dashboard</Text>
      <Text style={styles.subtitle}>Member Feedback Management</Text>

      {feedbacks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No pending feedback</Text>
          <Text style={styles.emptySubtext}>All feedback has been resolved or no submissions yet</Text>
        </View>
      ) : (
        <View style={styles.feedbackContainer}>
          {feedbacks.map((feedback) => (
            <View key={feedback.id} style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                <View style={styles.headerRow}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{feedback.user_name}</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusBadge, 
                        feedback.status === 'pending' ? styles.statusPending : styles.statusReviewed
                      ]}>
                        <Text style={styles.statusText}>{feedback.status.toUpperCase()}</Text>
                      </View>
                      {feedback.has_attachment && (
                        <View style={styles.attachmentBadge}>
                          <Text style={styles.attachmentText}>📎 {feedback.file_name || 'Attachment'}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.timestamp}>
                    {new Date(feedback.submitted_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              </View>
              <Text style={styles.subject}>{feedback.subject}</Text>
              <Text style={styles.message}>{feedback.message}</Text>
              
              {/* Action Buttons */}
              <View style={styles.actionContainer}>
                <TouchableOpacity 
                  style={styles.resolveButton}
                  onPress={() => resolveFeedback(feedback.id)}
                >
                  <Text style={styles.resolveButtonText}>✓ Mark as Resolved</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
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
  feedbackContainer: {
    gap: 16,
  },
  feedbackCard: {
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
  feedbackHeader: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flexDirection: 'column',
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  timestamp: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  subject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b5cf6',
    marginBottom: 8,
    lineHeight: 20,
  },
  message: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    fontWeight: '400',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusReviewed: {
    backgroundColor: '#dbeafe',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  attachmentBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  attachmentText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  actionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  resolveButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resolveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
