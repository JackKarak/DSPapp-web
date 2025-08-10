import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function Wellness() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [eventTitle, setEventTitle] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      // Verify wellness chair role
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('is_officer, position')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.is_officer || profile.position?.toLowerCase() !== 'wellness') {
        Alert.alert('Access Denied', 'This page is only accessible to Wellness Chairs.');
        router.replace('/');
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      router.replace('/(auth)/login');
    }
  };

  const handleSubmitEvent = async () => {
    if (!eventTitle.trim() || !eventLocation.trim()) {
      Alert.alert('Missing Information', 'Please fill in both title and location.');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      const { error } = await supabase.from('events').insert({
        title: eventTitle.trim(),
        location: eventLocation.trim(),
        description: eventDescription.trim() || null,
        point_type: 'h&w',
        point_value: 1,
        created_by: user.id,
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        is_registerable: true,
        available_to_pledges: true,
        status: 'pending'
      });

      if (error) {
        Alert.alert('Submission Error', 'Could not create event. Please try again.');
        return;
      }

      Alert.alert('Success! 🎉', 'Wellness event submitted for approval.');
      setEventTitle('');
      setEventLocation('');
      setEventDescription('');
    } catch (error) {
      console.error('Event creation error:', error);
      Alert.alert('Unexpected Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading wellness tools...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
      <Text style={styles.header}>💚 Health & Wellness</Text>
      <Text style={styles.subtitle}>Promote member health and wellness</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Create Wellness Event</Text>
        
        <Text style={styles.label}>Event Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Mental Health Workshop"
          placeholderTextColor="#9ca3af"
          value={eventTitle}
          onChangeText={setEventTitle}
        />

        <Text style={styles.label}>Location *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter event location"
          placeholderTextColor="#9ca3af"
          value={eventLocation}
          onChangeText={setEventLocation}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the wellness activity"
          placeholderTextColor="#9ca3af"
          value={eventDescription}
          onChangeText={setEventDescription}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmitEvent}
          disabled={submitting}
          activeOpacity={0.7}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting Event...' : 'Submit for Approval'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Wellness Resources</Text>
        <Text style={styles.resourceText}>
          • Mental health workshops and seminars{'\n'}
          • Physical fitness activities and challenges{'\n'}
          • Stress management sessions{'\n'}
          • Nutrition education programs{'\n'}
          • Campus counseling service partnerships{'\n'}
          • Mindfulness and meditation sessions
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Event Ideas</Text>
        <Text style={styles.resourceText}>
          • Yoga or fitness classes{'\n'}
          • Mental health awareness talks{'\n'}
          • Healthy cooking workshops{'\n'}
          • Outdoor hiking or sports{'\n'}
          • Stress relief activities during finals{'\n'}
          • Sleep hygiene education
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  header: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    height: 50,
    borderColor: '#d1d5db',
    borderWidth: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginVertical: 10,
    fontSize: 16,
    color: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  resourceText: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
});
