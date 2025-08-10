import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function OfficerEventsView() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Officer Events Dashboard</Text>
        <Text style={styles.subtitle}>View and manage upcoming events</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.placeholder}>
          Events dashboard will be implemented here.
        </Text>
        <Text style={styles.description}>
          This section will show upcoming events, allow officers to manage event details, and track attendance.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#330066',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e0e0',
  },
  content: {
    padding: 20,
  },
  placeholder: {
    fontSize: 18,
    fontWeight: '600',
    color: '#330066',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
});