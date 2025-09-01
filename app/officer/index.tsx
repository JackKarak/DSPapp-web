import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useOfficerRole } from '../../hooks/useOfficerRole';

interface DashboardStats {
  eventsCreated: number;
  eventsPending: number;
  eventsThisMonth: number;
  avgRating: number;
}

export default function OfficerDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    eventsCreated: 0,
    eventsPending: 0,
    eventsThisMonth: 0,
    avgRating: 0
  });
  const { role, loading: roleLoading } = useOfficerRole();
  const router = useRouter();

  useEffect(() => {
    if (!roleLoading && role.is_officer) {
      fetchDashboardStats();
    }
  }, [roleLoading, role]);

  const fetchDashboardStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get events created by this officer
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, status, start_time, created_at')
        .eq('created_by', user.id);

      if (eventsError) throw eventsError;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const dashboardStats: DashboardStats = {
        eventsCreated: events?.length || 0,
        eventsPending: events?.filter(e => e.status === 'pending').length || 0,
        eventsThisMonth: events?.filter(e => new Date(e.created_at) >= startOfMonth).length || 0,
        avgRating: 0
      };

      // Get average rating for officer's events
      if (events && events.length > 0) {
        const eventIds = events.map(e => e.id);
        const { data: feedback } = await supabase
          .from('event_feedback')
          .select('rating')
          .in('event_id', eventIds)
          .not('rating', 'is', null);

        if (feedback && feedback.length > 0) {
          const totalRating = feedback.reduce((sum, fb) => sum + fb.rating, 0);
          dashboardStats.avgRating = totalRating / feedback.length;
        }
      }

      setStats(dashboardStats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Create Event',
      description: 'Register a new event',
      icon: '📅',
      onPress: () => router.push('/officer/register')
    },
    {
      title: 'My Events',
      description: 'Manage your events',
      icon: '📋',
      onPress: () => router.push('/officer/events')
    },
    {
      title: 'Analytics',
      description: 'View performance data',
      icon: '📊',
      onPress: () => router.push('/officer/analytics')
    }
  ];

  if (roleLoading || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back!</Text>
        <Text style={styles.roleText}>{role.position?.replace('_', ' ').toUpperCase()}</Text>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.eventsCreated}</Text>
          <Text style={styles.statLabel}>Total Events</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.eventsPending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.eventsThisMonth}</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.avgRating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionDescription}>{action.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Officer Resources</Text>
        <View style={styles.resourcesList}>
          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => router.push('/officer/officerspecs')}
          >
            <Text style={styles.resourceIcon}>📖</Text>
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Officer Specifications</Text>
              <Text style={styles.resourceDescription}>View your role requirements</Text>
            </View>
          </TouchableOpacity>
          
          {role.position === 'historian' && (
            <TouchableOpacity 
              style={styles.resourceItem}
              onPress={() => router.push('/officer/historian')}
            >
              <Text style={styles.resourceIcon}>📢</Text>
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>Marketing Tools</Text>
                <Text style={styles.resourceDescription}>Manage marketing activities</Text>
              </View>
            </TouchableOpacity>
          )}
          
          {role.position === 'scholarship' && (
            <TouchableOpacity 
              style={styles.resourceItem}
              onPress={() => router.push('/officer/scholarship')}
            >
              <Text style={styles.resourceIcon}>🎓</Text>
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>Scholarship Management</Text>
                <Text style={styles.resourceDescription}>Track academic progress</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#5f6368',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaed',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 16,
    color: '#4285F4',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4285F4',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#5f6368',
    fontWeight: '500',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '31%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e8eaed',
    minHeight: 120,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202124',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: '#5f6368',
    textAlign: 'center',
    lineHeight: 16,
  },
  resourcesList: {
    gap: 12,
  },
  resourceItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  resourceIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 2,
  },
  resourceDescription: {
    fontSize: 14,
    color: '#5f6368',
  },
});
