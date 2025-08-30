import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { googleCalendarService } from '../lib/googleCalendar';

const TestCalendarScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  const testCalendarAuth = async () => {
    setIsLoading(true);
    setLastResult('Testing authentication...');
    
    try {
      const calendarService = googleCalendarService;
      await calendarService.initialize();
      
      // Test creating an event
      const testEvent = {
        title: 'DSP Test Event',
        description: 'This is a test event created by the DSP App',
        startTime: '2025-02-15T19:00:00-05:00',
        endTime: '2025-02-15T21:00:00-05:00',
        location: 'DSP House'
      };

      const result = await calendarService.createCalendarEvent(testEvent);
      
      if (result.success) {
        setLastResult(`✅ Success! Event created with ID: ${result.eventId}`);
        Alert.alert('Success!', `Event created successfully!\nID: ${result.eventId}`);
      } else {
        setLastResult(`❌ Failed: ${result.error}`);
        Alert.alert('Error', result.error || 'Unknown error');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastResult(`💥 Exception: ${errorMessage}`);
      Alert.alert('Exception', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Google Calendar Test</Text>
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={testCalendarAuth}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Calendar Integration'}
        </Text>
      </TouchableOpacity>

      {lastResult ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Last Result:</Text>
          <Text style={styles.resultText}>{lastResult}</Text>
        </View>
      ) : null}
      
      <Text style={styles.info}>
        This test will:
        {'\n'}• Authenticate with Google Calendar
        {'\n'}• Create a test event
        {'\n'}• Display the result
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resultContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  resultText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  info: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TestCalendarScreen;
