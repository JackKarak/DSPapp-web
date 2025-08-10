import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useOfficerRole } from '../../hooks/useOfficerRole';
import { supabase } from '../../lib/supabase';

export default function OfficerHome() {
  const { role, loading: roleLoading } = useOfficerRole();
  const [stats, setStats] = useState({
    totalEvents: 0,
    pendingEvents: 0,
    approvedEvents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && role?.is_officer) {
      fetchStats();
    }
  }, [role, roleLoading]);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get officer's event statistics
      const { data: events } = await supabase
        .from('events')
        .select('status')
        .eq('created_by', user.id);

      if (events) {
        setStats({
          totalEvents: events.length,
          pendingEvents: events.filter(e => e.status === 'pending').length,
          approvedEvents: events.filter(e => e.status === 'approved').length,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#330066" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome, Officer!</Text>
        <Text style={styles.subtitle}>
          {role?.position ? `Position: ${role.position.replace(/_/g, ' ').toUpperCase()}` : 'Officer Dashboard'}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalEvents}</Text>
          <Text style={styles.statLabel}>Total Events</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.pendingEvents}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.approvedEvents}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Text style={styles.actionText}>• Use the tabs below to navigate</Text>
        <Text style={styles.actionText}>• Create events in the Register tab</Text>
        <Text style={styles.actionText}>• View analytics to track performance</Text>
        <Text style={styles.actionText}>• Manage events in the Events tab</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    padding: 24,
    backgroundColor: '#330066',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-around',
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
    borderColor: '#e0e0e0',
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#330066',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  quickActions: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    margin: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#330066',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 16,
    color: '#444',
    marginBottom: 8,
    lineHeight: 22,
  },
});
