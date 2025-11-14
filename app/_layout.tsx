import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, ImageBackground, StyleSheet, View } from 'react-native';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import * as Sentry from '@sentry/react-native';
import backgroundImage from '../assets/images/background.png'; // Adjust if path differs
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useNotifications } from '../hooks/useNotifications';

// Initialize Sentry for production error tracking
Sentry.init({
  dsn: 'https://b8e0260002b7914471f3d3ee32e739dd@o4510316884393984.ingest.us.sentry.io/4510316891930624',
  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
  // Enable in production only
  enabled: !__DEV__,
  environment: __DEV__ ? 'development' : 'production',
});

const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#330066',       // Fraternity Purple
    background: '#ffffff',
    secondary: '#F7B910',     // Gold
    surfaceVariant: '#ADAFAA' // Silver tone
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Initialize notifications
  useNotifications();

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#330066" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <PaperProvider theme={paperTheme}>
        <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
          <View style={styles.overlay}>
            <Slot />
            <StatusBar style="auto" />
          </View>
        </ImageBackground>
      </PaperProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.85)', // white overlay for legibility
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  
});

