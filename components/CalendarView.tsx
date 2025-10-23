/**
 * CalendarView Component
 * 
 * Displays an embedded Google Calendar view using WebView
 */

import React from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';

const CALENDAR_URL = 'https://calendar.google.com/calendar/embed?src=2fcabe745ddb6168899f921984a988938842026359b78e7588d129e64e84dde6%40group.calendar.google.com&ctz=America%2FNew_York';

export const CalendarView: React.FC = () => {
  return (
    <View style={styles.calendarContainer}>
      <WebView
        style={styles.calendar}
        source={{ uri: CALENDAR_URL }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  calendarContainer: {
    height: Dimensions.get('window').height * 0.6,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  calendar: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
  },
});
