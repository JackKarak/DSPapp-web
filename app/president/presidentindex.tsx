import { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
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

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('admin_feedback')
        .select('*, users:user_id(name)')
        .order('submitted_at', { ascending: false });

      if (feedbackError) throw feedbackError;

      const formattedFeedbacks: Feedback[] = feedbackData.map((fb: any) => ({
        id: fb.id,
        submitted_at: fb.submitted_at,
        subject: fb.subject,
        message: fb.message,
        user_id: fb.user_id,
        user_name: fb.users?.name || 'Unknown User'
      }));

      setFeedbacks(formattedFeedbacks);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      Alert.alert('Error', 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#330066" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>👑 Admin Dashboard</Text>
      <Text style={styles.subtitle}>Member Feedback Management</Text>

      {feedbacks.length === 0 ? (
        <Text style={styles.noFeedback}>No feedback submissions yet</Text>
      ) : (
        feedbacks.map((feedback) => (
          <View key={feedback.id} style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <Text style={styles.userName}>{feedback.user_name}</Text>
              <Text style={styles.timestamp}>
                {new Date(feedback.submitted_at).toLocaleString()}
              </Text>
            </View>
            <Text style={styles.subject}>{feedback.subject}</Text>
            <Text style={styles.message}>{feedback.message}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#330066',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#0038A8',
    marginBottom: 24,
  },
  noFeedback: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontSize: 16,
  },
  feedbackCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  subject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0038A8',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  }
});
