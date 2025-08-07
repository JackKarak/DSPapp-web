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
import { supabase } from '../../../lib/supabase';

export default function EventManagerControl() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

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

      // Verify Event Manager Officer access
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('is_officer, officer_position, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.is_officer || profile.officer_position?.toLowerCase() !== 'event manager') {
        Alert.alert('Access Denied', 'This page is only accessible to Event Managers.');
        router.replace('/(tabs)');
        return;
      }

      setUserProfile(profile);
      setLoading(false);
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      router.replace('/(auth)/login');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading event management controls...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
      <Text style={styles.header}>🎉 Event Management Dashboard</Text>
      <Text style={styles.subtitle}>Welcome, {userProfile?.first_name} {userProfile?.last_name}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Event Planning</Text>
        <Text style={styles.description}>
          Plan, organize, and execute chapter events from conception to completion.
        </Text>
        {/* Add your event manager-specific functionality here */}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Event Management Tools</Text>
        <Text style={styles.description}>
          • Event calendar management{'\n'}
          • Venue booking coordination{'\n'}
          • Guest speaker arrangements{'\n'}
          • Catering and logistics{'\n'}
          • Event registration systems{'\n'}
          • Post-event feedback collection
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
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
});
