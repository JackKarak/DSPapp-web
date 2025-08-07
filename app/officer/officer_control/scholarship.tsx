import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import PermissionGuard from '../../../components/PermissionGuard';
import { useOfficer } from '../../../contexts/OfficerContext';

export default function ScholarshipControl() {
  const { currentOfficer } = useOfficer();

  return (
    <PermissionGuard permissions="scholarship:manage">
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>VP Scholarship Dashboard</Text>
          {currentOfficer && (
            <Text style={styles.welcomeText}>
              Welcome, {currentOfficer.first_name} {currentOfficer.last_name}
            </Text>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Scholarship Management</Text>
          <View style={styles.contentCard}>
            <Text style={styles.cardTitle}>Scholar Programs</Text>
            <Text style={styles.cardDescription}>
              Manage scholarship applications, awards, and academic recognition programs.
            </Text>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Academic Events</Text>
          <View style={styles.contentCard}>
            <Text style={styles.cardTitle}>Study Sessions</Text>
            <Text style={styles.cardDescription}>
              Organize study groups, tutoring sessions, and academic workshops.
            </Text>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recognition & Awards</Text>
          <View style={styles.contentCard}>
            <Text style={styles.cardTitle}>Academic Achievements</Text>
            <Text style={styles.cardDescription}>
              Track and celebrate academic milestones and achievements.
            </Text>
          </View>
        </View>
      </ScrollView>
    </PermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#7B2CBF',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  welcomeText: {
    fontSize: 16,
    color: '#E6D5F5',
  },
  sectionContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#7B2CBF',
    marginBottom: 10,
  },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
