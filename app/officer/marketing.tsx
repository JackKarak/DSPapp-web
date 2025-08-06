import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function MarketingScreen() {
  const [newsletterUrl, setNewsletterUrl] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCurrentNewsletterUrl();
  }, []);

  const fetchCurrentNewsletterUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'newsletter_url')
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is ok for first time
        throw error;
      }

      const url = data?.value || '';
      setCurrentUrl(url);
      setNewsletterUrl(url);
    } catch (error) {
      console.error('Error fetching newsletter URL:', error);
      Alert.alert('Error', 'Failed to load current newsletter URL');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUrl = async () => {
    if (!newsletterUrl.trim()) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    // Basic URL validation
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(newsletterUrl.trim())) {
      Alert.alert('Error', 'Please enter a valid URL starting with http:// or https://');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'newsletter_url',
          value: newsletterUrl.trim(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setCurrentUrl(newsletterUrl.trim());
      Alert.alert('Success', 'Newsletter URL updated successfully!');
    } catch (error) {
      console.error('Error updating newsletter URL:', error);
      Alert.alert('Error', 'Failed to update newsletter URL');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    if (!currentUrl) {
      Alert.alert('Info', 'No newsletter URL is currently set');
      return;
    }
    Alert.alert('Current Newsletter URL', currentUrl);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#330066" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Newsletter Management</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Newsletter URL</Text>
        <View style={styles.currentUrlContainer}>
          <Text style={styles.currentUrl}>
            {currentUrl || 'No URL set'}
          </Text>
          <TouchableOpacity 
            style={styles.previewButton}
            onPress={handlePreview}
          >
            <Text style={styles.previewButtonText}>Preview</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Update Newsletter URL</Text>
        <Text style={styles.description}>
          Enter the new newsletter URL that brothers will see in their newsletter tab.
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="https://your-newsletter-url.com"
          value={newsletterUrl}
          onChangeText={setNewsletterUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <TouchableOpacity
          style={[styles.updateButton, saving && styles.updateButtonDisabled]}
          onPress={handleUpdateUrl}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.updateButtonText}>Update Newsletter URL</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>📋 Instructions</Text>
        <Text style={styles.infoText}>
          • Copy the URL from your newsletter platform (Mailchimp, Constant Contact, etc.){'\n'}
          • Make sure the URL starts with http:// or https://{'\n'}
          • Brothers will see this link in their Newsletter tab{'\n'}
          • Changes take effect immediately
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#330066',
    padding: 20,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#330066',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  currentUrlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  currentUrl: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
  previewButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  updateButton: {
    backgroundColor: '#330066',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  updateButtonDisabled: {
    backgroundColor: '#999',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    padding: 20,
    backgroundColor: '#F8F9FA',
    margin: 20,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#330066',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#330066',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});
