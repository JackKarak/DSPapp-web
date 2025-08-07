import { Link } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PermissionGuard from '../../components/PermissionGuard';
import { useOfficer } from '../../contexts/OfficerContext';

const DASHBOARD_SECTIONS = [
  {
    title: 'Event Management',
    permission: 'events:manage',
    items: [
      { name: 'Create Event', path: '/officer/shared/events', permission: 'events:create' },
      { name: 'Event Analytics', path: '/officer/shared/analytics', permission: 'events:view' },
    ]
  },
  {
    title: 'User Management',
    permission: 'users:manage',
    items: [
      { name: 'Member Registration', path: '/officer/shared/register', permission: 'users:create' },
      { name: 'Administrative', path: '/officer/officer_control/administrative', permission: 'users:admin' },
    ]
  },
  {
    title: 'Position Management',
    permission: 'positions:manage',
    items: [
      { name: 'Brotherhood', path: '/officer/officer_control/brotherhood', permission: 'brotherhood:manage' },
      { name: 'Marketing', path: '/officer/officer_control/marketing', permission: 'marketing:manage' },
      { name: 'Professional', path: '/officer/officer_control/professional', permission: 'professional:manage' },
      { name: 'Scholarship', path: '/officer/officer_control/scholarship', permission: 'scholarship:manage' },
      { name: 'Service', path: '/officer/officer_control/service', permission: 'service:manage' },
      { name: 'Fundraising', path: '/officer/officer_control/fundraising', permission: 'fundraising:manage' },
      { name: 'Wellness', path: '/officer/officer_control/wellness', permission: 'wellness:manage' },
      { name: 'Social', path: '/officer/officer_control/social', permission: 'social:manage' },
    ]
  },
  {
    title: 'Executive Functions',
    permission: 'executive:access',
    items: [
      { name: 'Executive Dashboard', path: '/officer/officer_control/executive', permission: 'executive:manage' },
      { name: 'General Operations', path: '/officer/officer_control/general', permission: 'general:manage' },
    ]
  },
  {
    title: 'President Functions',
    permission: 'president:access',
    items: [
      { name: 'Override System', path: '/president/override', permission: 'president:override' },
      { name: 'Confirmation', path: '/president/confirm', permission: 'president:confirm' },
      { name: 'President Analytics', path: '/president/analytics', permission: 'president:analytics' },
    ]
  }
];

export default function OfficerDashboard() {
  const { currentOfficer, loading } = useOfficer();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Officer Dashboard</Text>
        {currentOfficer && (
          <Text style={styles.subtitle}>
            Welcome, {currentOfficer.first_name} ({currentOfficer.officer_position})
          </Text>
        )}
      </View>

      {DASHBOARD_SECTIONS.map((section, index) => (
        <PermissionGuard key={index} permissions={section.permission} showFallback={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.itemsContainer}>
              {section.items.map((item, itemIndex) => (
                <PermissionGuard key={itemIndex} permissions={item.permission} showFallback={false}>
                  <Link href={item.path as any} asChild>
                    <TouchableOpacity style={styles.dashboardItem}>
                      <Text style={styles.itemText}>{item.name}</Text>
                      <Text style={styles.itemArrow}>→</Text>
                    </TouchableOpacity>
                  </Link>
                </PermissionGuard>
              ))}
            </View>
          </View>
        </PermissionGuard>
      ))}

      <PermissionGuard permissions={[]}>
        <View style={styles.noAccessContainer}>
          <Text style={styles.noAccessText}>
            You don't have officer permissions to access this dashboard.
          </Text>
        </View>
      </PermissionGuard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#687076',
  },
  header: {
    padding: 20,
    backgroundColor: '#7B2CBF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#E6D5F5',
  },
  section: {
    margin: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7B2CBF',
    marginBottom: 10,
  },
  itemsContainer: {
    gap: 8,
  },
  dashboardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  itemArrow: {
    fontSize: 18,
    color: '#7B2CBF',
    fontWeight: 'bold',
  },
  noAccessContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noAccessText: {
    fontSize: 16,
    color: '#687076',
    textAlign: 'center',
  },
});
