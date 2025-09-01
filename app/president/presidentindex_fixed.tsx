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
  const [showResolved, setShowResolved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [showResolved]);

  const fetchFeedbacks = async () => {
    console.log('🔄 Starting fetchFeedbacks...');
    setLoading(true);

    try {
      // Check authentication first
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      console.log('👤 Auth check result:', { user: user?.id, error: userError });

      if (userError || !user) {
        console.log('❌ Authentication failed');
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      console.log('📊 Building query with showResolved:', showResolved);

      // Simple approach: Just get feedback data directly
      let query = supabase
        .from('admin_feedback')
        .select('id, submitted_at, subject, message, user_id, status, has_attachment, file_name');

      if (!showResolved) {
        query = query.neq('status', 'resolved');
      }

      console.log('🔍 Executing feedback query...');
      const { data: rawFeedbackData, error: feedbackError } = await query.order('submitted_at', { ascending: false });

      console.log('📋 Feedback query result:', {
        data: rawFeedbackData,
        error: feedbackError,
        count: rawFeedbackData?.length
      });

      if (feedbackError) {
        console.error('❌ Feedback query failed:', feedbackError);
        Alert.alert('Database Error', `Unable to access feedback table: ${feedbackError.message}`);
        setLoading(false);
        return;
      }

      if (!rawFeedbackData || rawFeedbackData.length === 0) {
        console.log('📭 No feedback data found');
        setFeedbacks([]);
        setLoading(false);
        return;
      }

      console.log('✅ Got feedback data, fetching user names...');
      
      // Get unique user IDs and fetch user names separately
      const userIds = [...new Set(rawFeedbackData.map(fb => fb.user_id))];
      console.log('👥 User IDs to fetch:', userIds);

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      console.log('👤 Users data result:', { data: usersData, error: usersError });

      // Combine the feedback data with user names
      const formattedFeedbacks: Feedback[] = rawFeedbackData.map((fb: any) => ({
        id: fb.id,
        submitted_at: fb.submitted_at,
        subject: fb.subject,
        message: fb.message,
        user_id: fb.user_id,
        status: fb.status,
        has_attachment: fb.has_attachment,
        file_name: fb.file_name,
        user_name: (() => {
          const userData = usersData?.find(u => u.user_id === fb.user_id);
          return userData?.first_name && userData?.last_name 
            ? `${userData.first_name} ${userData.last_name}` 
            : 'Unknown User';
        })()
      }));

      console.log('✅ Final formatted feedbacks:', formattedFeedbacks.length, 'items');
      setFeedbacks(formattedFeedbacks);
    } catch (error) {
      console.error('💥 Error fetching feedback:', error);
      Alert.alert('Unexpected Error', `Something went wrong: ${error}`);
    } finally {
      console.log('🏁 FetchFeedbacks finished, loading set to false');
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
      
      {/* Filter Toggle */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, !showResolved && styles.filterButtonActive]}
          onPress={() => setShowResolved(false)}
        >
          <Text style={[styles.filterButtonText, !showResolved && styles.filterButtonTextActive]}>
            Pending Only
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, showResolved && styles.filterButtonActive]}
          onPress={() => setShowResolved(true)}
        >
          <Text style={[styles.filterButtonText, showResolved && styles.filterButtonTextActive]}>
            Show All
          </Text>
        </TouchableOpacity>
      </View>

      {feedbacks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No feedback found</Text>
          <Text style={styles.emptySubtext}>
            {loading ? 'Loading...' : 'No feedback submissions in the database yet'}
          </Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => fetchFeedbacks()}
          >
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
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
                        feedback.status === 'pending' ? styles.statusPending : 
                        feedback.status === 'resolved' ? styles.statusResolved : styles.statusReviewed
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
              {feedback.status !== 'resolved' && (
                <View style={styles.actionContainer}>
                  <TouchableOpacity 
                    style={styles.resolveButton}
                    onPress={() => resolveFeedback(feedback.id)}
                  >
                    <Text style={styles.resolveButtonText}>✓ Mark as Resolved</Text>
                  </TouchableOpacity>
                </View>
              )}
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
  statusResolved: {
    backgroundColor: '#dcfce7',
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
  refreshButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#8b5cf6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
