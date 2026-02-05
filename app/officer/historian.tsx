import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import type { User } from '@supabase/supabase-js';

const DEFAULT_NEWSLETTER_URL = 'https://mailchi.mp/f868da07ca2d/dspatch-feb-21558798?e=bbc0848b47';

// Proper URL validation
const isValidUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export default function Historian() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [newsletterUrl, setNewsletterUrl] = useState(DEFAULT_NEWSLETTER_URL);
  const [isDefaultUrl, setIsDefaultUrl] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingNewsletter, setUpdatingNewsletter] = useState(false);

  // Authentication and data loading
  const initializeData = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.replace('/(auth)/login');
        return;
      }

      // Verify historian role
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('officer_position')
        .eq('user_id', user.id)
        .single();

      if (profileError || profile?.officer_position?.toLowerCase() !== 'historian') {
        Alert.alert('Access Denied', 'This page is only accessible to Historians.');
        router.replace('/');
        return;
      }

      // Load newsletter URL
      const { data: settingsData, error: settingsError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'newsletter_url')
        .single();

      if (!settingsError && settingsData?.value) {
        setNewsletterUrl(settingsData.value);
        setIsDefaultUrl(false);
      }
      
    } catch (error) {
      console.error('Initialization error:', error);
      router.replace('/(auth)/login');
    } finally {
      setLoading(false);
    }
  }, [router]);



  const handleSubmitCampaign = useCallback(async () => {
    const title = campaignTitle.trim();
    const description = campaignDescription.trim();
    const audience = targetAudience.trim() || 'General';

    if (!title || !description) {
      Alert.alert('Missing Information', 'Please fill in both title and description.');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('marketing_campaigns').insert({
        title,
        description,
        target_audience: audience,
        created_by: user.id,
        status: 'draft'
      });

      if (error) throw error;

      Alert.alert('Success! 🎉', 'Marketing campaign created successfully.');
      setCampaignTitle('');
      setCampaignDescription('');
      setTargetAudience('');
      
    } catch (error) {
      console.error('Campaign creation error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Could not create campaign');
    } finally {
      setSubmitting(false);
    }
  }, [campaignTitle, campaignDescription, targetAudience]);

  const handleUpdateNewsletterUrl = useCallback(async () => {
    const url = newsletterUrl.trim();

    if (!url) {
      Alert.alert('Missing Information', 'Please enter a newsletter URL.');
      return;
    }

    if (!isValidUrl(url)) {
      Alert.alert('Invalid URL', 'Please enter a valid HTTP/HTTPS URL.');
      return;
    }

    setUpdatingNewsletter(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'newsletter_url',
          value: url,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key',
          ignoreDuplicates: false
        });

      if (error) throw error;

      setIsDefaultUrl(false);
      Alert.alert('Success! 🎉', 'Newsletter URL updated successfully.');
      
    } catch (error) {
      console.error('Newsletter URL update error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Could not update URL');
    } finally {
      setUpdatingNewsletter(false);
    }
  }, [newsletterUrl]);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading marketing tools...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
      <Text style={styles.header}>📢 Marketing Tools</Text>
      <Text style={styles.subtitle}>Create and manage marketing campaigns (Historian Access)</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Create New Campaign</Text>
        
        <Text style={styles.label}>Campaign Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter campaign title"
          placeholderTextColor="#9ca3af"
          value={campaignTitle}
          onChangeText={setCampaignTitle}
          editable={!submitting}
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your marketing campaign"
          placeholderTextColor="#9ca3af"
          value={campaignDescription}
          onChangeText={setCampaignDescription}
          multiline
          numberOfLines={4}
          editable={!submitting}
        />

        <Text style={styles.label}>Target Audience</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., All members, Pledges, Alumni"
          placeholderTextColor="#9ca3af"
          value={targetAudience}
          onChangeText={setTargetAudience}
          editable={!submitting}
        />

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmitCampaign}
          disabled={submitting}
          activeOpacity={0.7}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Creating Campaign...' : 'Create Campaign'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Newsletter URL Management</Text>
        <Text style={styles.subtitle}>Update the newsletter link that appears in the newsletter tab</Text>
        
        <Text style={styles.label}>
          Current Newsletter URL * {isDefaultUrl && <Text style={styles.defaultLabel}>(Default)</Text>}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Enter new newsletter URL"
          placeholderTextColor="#9ca3af"
          value={newsletterUrl}
          onChangeText={setNewsletterUrl}
          editable={!updatingNewsletter}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.submitButton, updatingNewsletter && styles.submitButtonDisabled]}
          onPress={handleUpdateNewsletterUrl}
          disabled={updatingNewsletter}
          activeOpacity={0.7}
        >
          <Text style={styles.submitButtonText}>
            {updatingNewsletter ? 'Updating URL...' : 'Update Newsletter URL'}
          </Text>
        </TouchableOpacity>
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
  defaultLabel: {
    color: '#f59e0b',
    fontStyle: 'italic',
    fontSize: 14,
    fontWeight: '500',
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
});
