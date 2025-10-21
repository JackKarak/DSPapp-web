import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useOfficerRole } from '../../hooks/useOfficerRole';
import { supabase } from '../../lib/supabase';
import { AccountDeletionService } from '../../lib/accountDeletion';

interface DashboardStats {
  eventsCreated: number;
  eventsPending: number;
  eventsThisMonth: number;
  avgRating: number | null;
}

const CONFIRMATION_TEXT = 'DELETE MY ACCOUNT';

export default function OfficerDashboard() {
  const router = useRouter();
  const { role, loading: roleLoading } = useOfficerRole();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    eventsCreated: 0,
    eventsPending: 0,
    eventsThisMonth: 0,
    avgRating: null
  });
  
  // Account deletion state
  const [accountDeletionModalVisible, setAccountDeletionModalVisible] = useState(false);
  const [deletionConfirmationText, setDeletionConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Memoized dashboard stats fetch
  const fetchDashboardStats = useCallback(async () => {
    try {
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

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
        avgRating: null
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
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  // Race condition protection
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!roleLoading && role.is_officer) {
        await fetchDashboardStats();
        if (!isMounted) return;
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [roleLoading, role.is_officer, fetchDashboardStats]);

  // Memoized quick actions
  const quickActions = useMemo(() => [
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
  ], [router]);

  // Memoized visible resources based on role
  const visibleResources = useMemo(() => {
    const resources = [
      {
        key: 'specs',
        icon: '📖',
        title: 'Officer Specifications',
        description: 'View your role requirements',
        route: '/officer/officerspecs',
        visible: true
      },
      {
        key: 'marketing',
        icon: '📢',
        title: 'Marketing Tools',
        description: 'Manage marketing activities',
        route: '/officer/historian',
        visible: role.position === 'historian'
      },
      {
        key: 'scholarship',
        icon: '🎓',
        title: 'Scholarship Management',
        description: 'Track academic progress',
        route: '/officer/scholarship',
        visible: role.position === 'scholarship'
      }
    ];
    
    return resources.filter(r => r.visible);
  }, [role.position]);

  // Memoized account deletion handler
  const handleAccountDeletion = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone and will:\n\n• Delete all your personal data\n• Remove your event history\n• Cancel any pending appeals\n• Remove you from all organizations\n\nThis process may take up to 30 days to complete.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => setAccountDeletionModalVisible(true),
        },
      ]
    );
  }, []);

  // Memoized account deletion confirmation
  const confirmAccountDeletion = useCallback(async () => {
    if (deletionConfirmationText !== CONFIRMATION_TEXT) {
      Alert.alert(
        'Confirmation Required', 
        `Please type "${CONFIRMATION_TEXT}" exactly to confirm deletion (case sensitive).`
      );
      return;
    }

    setIsDeletingAccount(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Authentication Error', 'User session expired. Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      // Call the account deletion service
      const result = await AccountDeletionService.deleteAccount(user.id);

      if (!result.success) {
        console.error('Account deletion error:', result.error);
        Alert.alert(
          'Deletion Failed',
          `${result.error || 'An error occurred'}. Please try again or contact support if the problem persists.`,
          [
            { text: 'Cancel', onPress: () => setAccountDeletionModalVisible(false) },
            { text: 'Retry', onPress: confirmAccountDeletion }
          ]
        );
        setIsDeletingAccount(false);
        return;
      }

      // Set state before navigation
      setIsDeletingAccount(false);
      setAccountDeletionModalVisible(false);
      setDeletionConfirmationText('');

      // Sign out the user
      await supabase.auth.signOut();

      Alert.alert(
        'Account Deletion Initiated',
        'Your account deletion has been initiated. You have been logged out and your data will be permanently removed within 30 days. If you change your mind, you can contact support within 7 days to potentially recover your account.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(auth)/login');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Unexpected error during account deletion:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setIsDeletingAccount(false);
    }
  }, [deletionConfirmationText, router]);

  if (roleLoading || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back!</Text>
        <Text style={styles.roleText}>{role.position?.replace('_', ' ').toUpperCase()}</Text>
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <TouchableOpacity onPress={fetchDashboardStats} style={styles.retryButton}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      )}

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
          <Text style={styles.statNumber}>
            {stats.avgRating !== null ? stats.avgRating.toFixed(1) : 'N/A'}
          </Text>
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
          {visibleResources.map(resource => (
            <TouchableOpacity 
              key={resource.key}
              style={styles.resourceItem}
              onPress={() => router.push(resource.route as any)}
            >
              <Text style={styles.resourceIcon}>{resource.icon}</Text>
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>{resource.title}</Text>
                <Text style={styles.resourceDescription}>{resource.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Account Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Management</Text>
        <TouchableOpacity 
          style={styles.deleteAccountButton}
          onPress={handleAccountDeletion}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>

      {/* Account Deletion Modal */}
      <Modal
        visible={accountDeletionModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAccountDeletionModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            
            <Text style={styles.modalText}>
              This action is permanent and cannot be undone. All your data will be deleted within 30 days.
            </Text>
            
            <Text style={styles.modalInstructions}>
              To confirm, type "{CONFIRMATION_TEXT}" below (case sensitive):
            </Text>
            
            <TextInput
              style={styles.confirmationInput}
              value={deletionConfirmationText}
              onChangeText={setDeletionConfirmationText}
              placeholder="Type here to confirm..."
              autoCapitalize="characters"
              editable={!isDeletingAccount}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setAccountDeletionModalVisible(false);
                  setDeletionConfirmationText('');
                }}
                disabled={isDeletingAccount}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.deleteButton, isDeletingAccount && styles.disabledButton]}
                onPress={confirmAccountDeletion}
                disabled={isDeletingAccount}
              >
                <Text style={styles.deleteButtonText}>
                  {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
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
  errorContainer: {
    backgroundColor: '#fee2e2',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 4,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  
  // Account Management Styles
  deleteAccountButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteAccountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  modalInstructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
