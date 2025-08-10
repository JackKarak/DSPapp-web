import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, ImageBackground, StyleSheet, View } from 'react-native';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import backgroundImage from '../assets/images/background.png'; // Adjust if path differs

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

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#330066" />
      </View>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
        <View style={styles.overlay}>
          <Slot />
          <StatusBar style="auto" />
        </View>
      </ImageBackground>
    </PaperProvider>
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

