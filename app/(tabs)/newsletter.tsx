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
    
    // Set up real-time subscription to newsletter URL changes
    const subscription = supabase
      .channel('newsletter_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
          filter: 'key=eq.newsletter_url'
        },
        (payload: any) => {
          console.log('Newsletter URL updated:', payload);
          if (payload.new && payload.new.value) {
            setNewsletterUrl(payload.new.value);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
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
        console.log('Newsletter URL loaded:', data.value);
      } else {
        console.log('Using default newsletter URL');
      }
      // If there's an error or no data, keep the default URL
    } catch (error) {
      console.log('Error fetching newsletter URL, using default:', error);
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
      allowsBackForwardNavigationGestures={false}
      scalesPageToFit={true}
      scrollEnabled={true}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      decelerationRate="normal"
      renderLoading={() => (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#330066" />
          <Text style={styles.loadingText}>Loading newsletter...</Text>
        </View>
      )}
      onLoadStart={() => setLoading(true)}
      onLoadEnd={() => setLoading(false)}
      onError={(syntheticEvent: any) => {
        const { nativeEvent } = syntheticEvent;
        console.error('WebView error: ', nativeEvent);
      }}
      onHttpError={(syntheticEvent: any) => {
        const { nativeEvent } = syntheticEvent;
        console.warn('WebView HTTP error: ', nativeEvent);
      }}
      style={styles.webview}
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
  webview: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
