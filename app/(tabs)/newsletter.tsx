import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '../../lib/supabase';

const DEFAULT_NEWSLETTER_URL = 'https://mailchi.mp/f868da07ca2d/dspatch-feb-21558798?e=bbc0848b47';

export default function NewsletterScreen() {
  const [loading, setLoading] = useState(true);
  const [newsletterUrl, setNewsletterUrl] = useState(DEFAULT_NEWSLETTER_URL);
  const [initializing, setInitializing] = useState(true);

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

      if (!error && data?.value) {
        setNewsletterUrl(data.value);
      }
      // If there's an error or no data, keep the default URL
    } catch (error) {
      console.log('Newsletter URL fetch error (using default):', error);
      // Keep using default URL
    } finally {
      setInitializing(false);
    }
  };

  if (initializing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#330066" />
        <Text style={styles.loadingText}>Loading newsletter...</Text>
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
      onLoadStart={() => setLoading(true)}
      onLoadEnd={() => setLoading(false)}
      onError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('WebView error: ', nativeEvent);
      }}
    />
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
});
