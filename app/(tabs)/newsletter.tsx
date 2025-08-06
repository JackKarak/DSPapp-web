import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '../../lib/supabase';

export default function NewsletterScreen() {
  const [newsletterUrl, setNewsletterUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNewsletterUrl();
  }, []);

  const fetchNewsletterUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'newsletter_url')
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found
        throw error;
      }

      const url = data?.value || '';
      
      if (!url) {
        setError('No newsletter available at this time. Check back later!');
      } else {
        setNewsletterUrl(url);
      }
    } catch (error) {
      console.error('Error fetching newsletter URL:', error);
      setError('Unable to load newsletter. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#330066" />
        <Text style={styles.loadingText}>Loading newsletter...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>📰</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  if (!newsletterUrl) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>📰</Text>
        <Text style={styles.errorMessage}>
          No newsletter available at this time.{'\n'}Check back later!
        </Text>
      </View>
    );
  }

  return (
    <WebView
      source={{ uri: newsletterUrl }}
      startInLoadingState
      renderLoading={() => (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#330066" />
        </View>
      )}
      onError={() => {
        setError('Failed to load newsletter. Please check your internet connection.');
      }}
    />
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#330066',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
