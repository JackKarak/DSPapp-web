/**
 * FeedbackNotification Component
 * 
 * Displays pending admin feedback notification for officers/admins
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';

interface FeedbackNotificationProps {
  pendingCount: number;
  userRole: string;
}

export const FeedbackNotification: React.FC<FeedbackNotificationProps> = ({
  pendingCount,
  userRole,
}) => {
  // Only show for admins and officers
  if (userRole !== 'admin' && userRole !== 'officer') {
    return null;
  }

  const handlePress = () => {
    router.push('/president/presidentindex' as any);
  };

  return (
    <TouchableOpacity
      style={[
        styles.feedbackNotification,
        pendingCount > 0 && styles.feedbackNotificationActive
      ]}
      onPress={handlePress}
    >
      <View style={styles.feedbackContent}>
        <Text style={styles.feedbackIcon}>💬</Text>
        <View style={styles.feedbackTextContainer}>
          <Text style={styles.feedbackTitle}>Member Feedback</Text>
          <Text style={styles.feedbackCount}>
            {pendingCount > 0
              ? `${pendingCount} pending message${pendingCount > 1 ? 's' : ''}`
              : 'No pending messages'}
          </Text>
        </View>
        {pendingCount > 0 && (
          <View style={styles.feedbackBadge}>
            <Text style={styles.feedbackBadgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  feedbackNotification: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackNotificationActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  feedbackContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  feedbackTextContainer: {
    flex: 1,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  feedbackCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  feedbackBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  feedbackBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
