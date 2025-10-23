/**
 * SettingsSection Component
 * 
 * Displays account settings including data preferences and account deletion
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface SettingsSectionProps {
  onManageDataPreferences: () => void;
  onDeleteAccount: () => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  onManageDataPreferences,
  onDeleteAccount,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Settings</Text>
      
      <TouchableOpacity 
        style={styles.settingButton} 
        onPress={onManageDataPreferences}
      >
        <Text style={styles.settingButtonText}>Manage Data Preferences</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.settingButton, styles.deleteButton]} 
        onPress={onDeleteAccount}
      >
        <Text style={[styles.settingButtonText, styles.deleteButtonText]}>
          Delete Account
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 16,
  },
  settingButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  settingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    marginBottom: 0,
  },
  deleteButtonText: {
    color: 'white',
  },
});
