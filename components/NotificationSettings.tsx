/**
 * Notification Settings Screen Component
 * Add this to account settings or create a dedicated notifications screen
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { registerForPushNotifications, cancelAllNotifications } from '../lib/notifications';
import { scheduleUpcomingEventNotifications } from '../lib/scheduleNotifications';

export function NotificationSettings() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('users')
        .select('push_enabled')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setPushEnabled(data.push_enabled || false);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    try {
      setPushEnabled(enabled);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (enabled) {
        // Register for push notifications
        const token = await registerForPushNotifications();
        if (!token) {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive event reminders.'
          );
          setPushEnabled(false);
          return;
        }

        // Schedule notifications for upcoming events
        await scheduleUpcomingEventNotifications();
        
        Alert.alert(
          'Notifications Enabled',
          "You'll receive reminders 30 minutes before events with points!"
        );
      } else {
        // Disable notifications
        await supabase
          .from('users')
          .update({ push_enabled: false })
          .eq('user_id', user.id);

        // Cancel all scheduled notifications
        await cancelAllNotifications();

        Alert.alert('Notifications Disabled', 'You will no longer receive event reminders.');
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings');
      setPushEnabled(!enabled); // Revert on error
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Event Reminders</Text>
          <Text style={styles.description}>
            Get notified 30 minutes before events with points
          </Text>
        </View>
        <Switch
          value={pushEnabled}
          onValueChange={toggleNotifications}
          trackColor={{ false: '#d1d5db', true: '#F7B910' }}
          thumbColor={pushEnabled ? '#330066' : '#f3f4f6'}
          disabled={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
  },
});
