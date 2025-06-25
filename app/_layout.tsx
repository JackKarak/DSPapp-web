import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, ImageBackground, StyleSheet } from 'react-native';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import backgroundImage from '../assets/images/background.png'; // adjust path if needed

const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#330066',
    background: '#ffffff',
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={DefaultTheme}>
        <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
          <View style={styles.overlay}>
            <Slot />
            <StatusBar style="auto" />
          </View>
        </ImageBackground>
      </ThemeProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
});
