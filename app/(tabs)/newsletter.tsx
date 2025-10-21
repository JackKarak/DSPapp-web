import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useReducer } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '../../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

const DEFAULT_NEWSLETTER_URL = 'https://mailchi.mp/f868da07ca2d/dspatch-feb-21558798?e=bbc0848b47';

// Single state object - prevents multiple re-renders
type NewsletterState = {
  url: string;
  isLoading: boolean;
  error: string | null;
};

type NewsletterAction =
  | { type: 'LOADING' }
  | { type: 'SUCCESS'; url: string }
  | { type: 'ERROR'; error: string }
  | { type: 'RETRY' };

// Reducer for single state update
function newsletterReducer(state: NewsletterState, action: NewsletterAction): NewsletterState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, isLoading: true, error: null };
    case 'SUCCESS':
      return { url: action.url, isLoading: false, error: null };
    case 'ERROR':
      return { ...state, isLoading: false, error: action.error };
    case 'RETRY':
      return { ...state, isLoading: true, error: null };
    default:
      return state;
  }
}

export default function NewsletterScreen() {
  const [state, dispatch] = useReducer(newsletterReducer, {
    url: DEFAULT_NEWSLETTER_URL,
    isLoading: true,
    error: null,
  });

  // Memoized fetch function
  const fetchNewsletterUrl = useCallback(async () => {
    dispatch({ type: 'LOADING' });
    
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'newsletter_url')
        .maybeSingle(); // Better than .single() - doesn't error on no results

      if (error) throw error;

      const url = data?.value || DEFAULT_NEWSLETTER_URL;
      dispatch({ type: 'SUCCESS', url });
      
    } catch (error) {
      console.error('Error fetching newsletter URL:', error);
      // Still show default URL on error
      dispatch({ type: 'SUCCESS', url: DEFAULT_NEWSLETTER_URL });
    }
  }, []);

  // Only subscribe when tab is focused (saves battery & connections)
  useFocusEffect(
    useCallback(() => {
      let subscription: RealtimeChannel | null = null;

      // Fetch initial URL
      fetchNewsletterUrl();

      // Set up real-time subscription only when tab is visible
      subscription = supabase
        .channel('newsletter_updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'app_settings',
            filter: 'key=eq.newsletter_url',
          },
          (payload) => {
            if (payload.new?.value) {
              dispatch({ type: 'SUCCESS', url: payload.new.value });
            }
          }
        )
        .subscribe();

      // Cleanup when tab loses focus
      return () => {
        subscription?.unsubscribe();
      };
    }, [fetchNewsletterUrl])
  );

  // Loading state
  if (state.isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#330066" />
        <Text style={styles.loadingText}>Loading newsletter...</Text>
      </View>
    );
  }

  // Error state with retry
  if (state.error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load newsletter</Text>
        <Text style={styles.errorSubtext}>{state.error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => {
            dispatch({ type: 'RETRY' });
            fetchNewsletterUrl();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <WebView
      source={{ uri: state.url }}
      startInLoadingState
      allowsBackForwardNavigationGestures={false}
      scalesPageToFit
      javaScriptEnabled
      domStorageEnabled
      cacheEnabled
      renderLoading={() => (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#330066" />
          <Text style={styles.loadingText}>Loading newsletter...</Text>
        </View>
      )}
      onError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('WebView error:', nativeEvent);
        dispatch({ 
          type: 'ERROR', 
          error: `Failed to load: ${nativeEvent.description || 'Unknown error'}` 
        });
      }}
      onHttpError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.warn('WebView HTTP error:', nativeEvent.statusCode);
      }}
      style={styles.webview}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#330066',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  webview: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
