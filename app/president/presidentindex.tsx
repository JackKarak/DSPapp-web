import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
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
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      // Fetch admin feedback with user details
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('admin_feedback')
        .select(`
          id,
          submitted_at,
          subject,
          message,
          user_id,
          users!inner(first_name, last_name)
        `)
        .order('submitted_at', { ascending: false });

      if (feedbackError) {
        Alert.alert('Feedback Error', 'Unable to load feedback. Please try again.');
        setLoading(false);
        return;
      }

      const formattedFeedbacks: Feedback[] = feedbackData.map((fb: any) => ({
        id: fb.id,
        submitted_at: fb.submitted_at,
        subject: fb.subject,
        message: fb.message,
        user_id: fb.user_id,
        user_name: fb.users?.first_name && fb.users?.last_name 
          ? `${fb.users.first_name} ${fb.users.last_name}` 
          : 'Unknown User'
      }));

      setFeedbacks(formattedFeedbacks);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      Alert.alert('Unexpected Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.emptyText}>No feedback submissions yet</Text>
          <Text style={styles.emptySubtext}>Feedback from members will appear here</Text>
        </View>
      ) : (
        <View style={styles.feedbackContainer}>
          {feedbacks.map((feedback) => (
            <View key={feedback.id} style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{feedback.user_name}</Text>
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
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
});
