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

export default function Marketing() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [newsletterUrl, setNewsletterUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updatingNewsletter, setUpdatingNewsletter] = useState(false);

  useEffect(() => {
    checkAuthentication();
    fetchCurrentNewsletterUrl();
  }, []);

  const checkAuthentication = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      // Verify marketing officer role
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('officer_position')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.officer_position || profile.officer_position?.toLowerCase() !== 'marketing') {
        Alert.alert('Access Denied', 'This page is only accessible to Marketing Officers.');
        router.replace('/');
        return;
      }

      setLoading(false);
      await fetchCurrentNewsletterUrl();
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      router.replace('/(auth)/login');
    }
  };

  const handleSubmitCampaign = async () => {
    if (!campaignTitle.trim() || !campaignDescription.trim()) {
      Alert.alert('Missing Information', 'Please fill in both title and description.');
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

      const { error } = await supabase.from('marketing_campaigns').insert({
        title: campaignTitle.trim(),
        description: campaignDescription.trim(),
        target_audience: targetAudience.trim() || 'General',
        created_by: user.id,
        created_at: new Date().toISOString(),
        status: 'draft'
      });

      if (error) {
        Alert.alert('Submission Error', 'Could not create campaign. Please try again.');
        return;
      }

      Alert.alert('Success! 🎉', 'Marketing campaign created successfully.');
      setCampaignTitle('');
      setCampaignDescription('');
      setTargetAudience('');
    } catch (error) {
      console.error('Campaign creation error:', error);
      Alert.alert('Unexpected Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchCurrentNewsletterUrl = async () => {
    try {
      // First, try to get from app_settings table
      const { data: settingsData, error: settingsError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'newsletter_url')
        .single();

      if (settingsError) {        // If table doesn't exist, use default URL
        setNewsletterUrl('https://mailchi.mp/f868da07ca2d/dspatch-feb-21558798?e=bbc0848b47');
        return;
      }

      setNewsletterUrl(settingsData?.value || 'https://mailchi.mp/f868da07ca2d/dspatch-feb-21558798?e=bbc0848b47');
    } catch (error) {
      console.error('Error fetching newsletter URL:', error);
      // Fallback to default URL
      setNewsletterUrl('https://mailchi.mp/f868da07ca2d/dspatch-feb-21558798?e=bbc0848b47');
    }
  };

  const handleUpdateNewsletterUrl = async () => {
    if (!newsletterUrl.trim()) {
      Alert.alert('Missing Information', 'Please enter a newsletter URL.');
      return;
    }

    // Basic URL validation
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlPattern.test(newsletterUrl.trim())) {
      Alert.alert('Invalid URL', 'Please enter a valid URL.');
      return;
    }

    setUpdatingNewsletter(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      // Try to update existing setting
      const { data: existingSetting, error: fetchError } = await supabase
        .from('app_settings')
        .select('id')
        .eq('key', 'newsletter_url')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // Error other than "not found"
        console.error('Error fetching setting:', fetchError);
      }

      let updateError;

      if (existingSetting) {
        // Update existing setting
        const { error } = await supabase
          .from('app_settings')
          .update({ 
            value: newsletterUrl.trim(),
            updated_at: new Date().toISOString(),
            updated_by: user.id
          })
          .eq('key', 'newsletter_url');
        updateError = error;
      } else {
        // Create new setting
        const { error } = await supabase
          .from('app_settings')
          .insert({
            key: 'newsletter_url',
            value: newsletterUrl.trim(),
            created_by: user.id,
            updated_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        updateError = error;
      }

      if (updateError) {
        console.error('Update error:', updateError);
        Alert.alert('Update Error', 'Could not update newsletter URL. The app_settings table may not exist yet. Please contact your administrator.');
        return;
      }

      Alert.alert('Success! 🎉', 'Newsletter URL updated successfully. The new URL will be used in the newsletter tab.');
    } catch (error) {
      console.error('Newsletter URL update error:', error);
      Alert.alert('Unexpected Error', 'Something went wrong. Please try again.');
    } finally {
      setUpdatingNewsletter(false);
    }
  };

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
      <Text style={styles.subtitle}>Create and manage marketing campaigns</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Create New Campaign</Text>
        
        <Text style={styles.label}>Campaign Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter campaign title"
          placeholderTextColor="#9ca3af"
          value={campaignTitle}
          onChangeText={setCampaignTitle}
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
        />

        <Text style={styles.label}>Target Audience</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., All members, Pledges, Alumni"
          placeholderTextColor="#9ca3af"
          value={targetAudience}
          onChangeText={setTargetAudience}
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
        
        <Text style={styles.label}>Current Newsletter URL *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter new newsletter URL"
          placeholderTextColor="#9ca3af"
          value={newsletterUrl}
          onChangeText={setNewsletterUrl}
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

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Marketing Resources</Text>
        <Text style={styles.resourceText}>
          • Brand guidelines and logos{'\n'}
          • Social media templates{'\n'}
          • Event promotion materials{'\n'}
          • Contact alumni database team{'\n'}
          • Coordinate with VP Branding
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
