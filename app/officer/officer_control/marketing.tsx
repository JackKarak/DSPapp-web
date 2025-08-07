import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PermissionGuard from '../../../components/PermissionGuard';
import { useOfficer } from '../../../contexts/OfficerContext';

export default function MarketingControl() {
  const { currentOfficer } = useOfficer();

  return (
    <PermissionGuard permissions={['marketing:manage', 'vp_branding:manage']}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Marketing Dashboard</Text>
          {currentOfficer && (
            <Text style={styles.welcomeText}>
              Welcome, {currentOfficer.first_name} {currentOfficer.last_name}
            </Text>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Brand Management</Text>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.cardTitle}>Logo & Branding</Text>
            <Text style={styles.cardDescription}>
              Manage fraternity logo, colors, and brand guidelines for events and materials.
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Social Media</Text>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.cardTitle}>Content Calendar</Text>
            <Text style={styles.cardDescription}>
              Plan and schedule social media posts across all platforms.
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Event Promotion</Text>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.cardTitle}>Marketing Materials</Text>
            <Text style={styles.cardDescription}>
              Create flyers, posters, and digital content for upcoming events.
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Analytics</Text>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.cardTitle}>Engagement Metrics</Text>
            <Text style={styles.cardDescription}>
              Track social media performance and event attendance metrics.
            </Text>
          </TouchableOpacity>
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
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
