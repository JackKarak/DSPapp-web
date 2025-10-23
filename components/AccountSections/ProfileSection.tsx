/**
 * ProfileSection Component
 * 
 * Purpose: Display and edit user profile information
 * 
 * This component handles the display and editing of profile data.
 * It splits into two modes: display and edit, using dedicated sub-components.
 * 
 * Features:
 * - Profile display with all user info
 * - Edit mode with form validation
 * - 7-day edit cooldown enforcement
 * - Multi-major selection
 * - All dropdown fields
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UserProfile, ProfileFormData } from '../../types/hooks';
import { ProfileDisplay } from './ProfileDisplay';
import { ProfileEditForm } from './ProfileEditForm';
import { formatDateInEST } from '../../lib/dateUtils';
import { Colors } from '../../constants/colors';

interface ProfileSectionProps {
  profile: UserProfile | null;
  isEditing: boolean;
  formData: ProfileFormData;
  canEdit: boolean;
  nextEditDate: Date | null;
  daysUntilEdit: number;
  onUpdate: <K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  saving: boolean;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  profile,
  isEditing,
  formData,
  canEdit,
  nextEditDate,
  daysUntilEdit,
  onUpdate,
  onSave,
  onCancel,
  onStartEdit,
  saving,
}) => {
  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Profile data not available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      {isEditing ? (
        <ProfileEditForm
          formData={formData}
          onUpdate={onUpdate}
          onSave={onSave}
          onCancel={onCancel}
          saving={saving}
        />
      ) : (
        <>
          <ProfileDisplay profile={profile} />
          
          {canEdit ? (
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={onStartEdit}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editRestrictedContainer}>
              <Text style={styles.editRestrictedText}>
                You can edit your profile again in {daysUntilEdit} day{daysUntilEdit === 1 ? '' : 's'}
              </Text>
              {nextEditDate && (
                <Text style={styles.editRestrictedSubtext}>
                  Next edit available: {formatDateInEST(nextEditDate.toISOString())}
                </Text>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  editButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  editRestrictedContainer: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  editRestrictedText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  editRestrictedSubtext: {
    color: '#856404',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  errorText: {
    color: '#DC3545',
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
});
