import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function NewsletterScreen() {
  return (
    <WebView
      source={{ uri: 'https://mailchi.mp/f868da07ca2d/dspatch-feb-21558798?e=bbc0848b47' }}
      startInLoadingState
      renderLoading={() => (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#330066" />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});
