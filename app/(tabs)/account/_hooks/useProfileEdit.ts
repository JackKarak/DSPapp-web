/**
 * useProfileEdit Hook
 * 
 * Purpose: Handle all profile editing logic and state management
 * 
 * This hook centralizes all profile editing functionality including:
 * - Form state management
 * - Edit cooldown enforcement (7-day restriction)
 * - Profile validation
 * - Database updates
 * 
 * Impact:
 * - Removes 20+ state variables from main component
 * - Centralizes validation logic
 * - Makes editing flow testable
 * - Enforces business rules consistently
 */

import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { checkAuthentication, handleAuthenticationRedirect } from '../../lib/auth';
import { formatDateInEST } from '../../lib/dateUtils';
import { UserProfile, ProfileFormData } from '../../types/hooks';

// Profile edit cooldown in days
const PROFILE_EDIT_COOLDOWN_DAYS = 7;

interface UseProfileEditReturn {
  isEditing: boolean;
  formData: ProfileFormData;
  canEdit: boolean;
  nextEditDate: Date | null;
  daysUntilEdit: number;
  updateField: <K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => void;
  saveProfile: () => Promise<void>;
  cancelEdit: () => void;
  startEdit: () => void;
  saving: boolean;
}

/**
 * Check if user can edit their profile based on last update date
 */
const canEditProfile = (lastUpdate: string | null): boolean => {
  if (!lastUpdate) return true;
  
  const lastUpdateDate = new Date(lastUpdate);
  const now = new Date();
  const daysSince = Math.floor(
    (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return daysSince >= PROFILE_EDIT_COOLDOWN_DAYS;
};

/**
 * Get the next date when user can edit their profile
 */
const getNextEditDate = (lastUpdate: string | null): Date | null => {
  if (!lastUpdate) return null;
  
  const lastUpdateDate = new Date(lastUpdate);
  const nextDate = new Date(lastUpdateDate);
  nextDate.setDate(nextDate.getDate() + PROFILE_EDIT_COOLDOWN_DAYS);
  
  return nextDate;
};

/**
 * Get days remaining until next allowed edit
 */
const getDaysUntilEdit = (lastUpdate: string | null): number => {
  const nextDate = getNextEditDate(lastUpdate);
  if (!nextDate) return 0;
  
  const now = new Date();
  return Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Custom hook for managing profile editing
 * 
 * @param {UserProfile | null} profile - Current user profile data
 * @param {() => Promise<void>} onSaveSuccess - Callback to refresh data after save
 * @returns {UseProfileEditReturn} Profile editing state and functions
 * 
 * @example
 * ```tsx
 * const profileEdit = useProfileEdit(profile, refreshData);
 * 
 * <ProfileSection
 *   {...profileEdit}
 *   profile={profile}
 * />
 * ```
 */
export const useProfileEdit = (
  profile: UserProfile | null,
  onSaveSuccess?: () => Promise<void>
): UseProfileEditReturn => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({});
  const [saving, setSaving] = useState(false);

  // Calculate edit restrictions
  const canEdit = profile ? canEditProfile(profile.last_profile_update) : true;
  const nextEditDate = profile ? getNextEditDate(profile.last_profile_update) : null;
  const daysUntilEdit = profile ? getDaysUntilEdit(profile.last_profile_update) : 0;

  /**
   * Initialize form data when profile changes or editing starts
   */
  useEffect(() => {
    if (profile && isEditing) {
      // Parse majors into array for multi-select
      const majorsArray = profile.majors 
        ? profile.majors.split(', ').filter(m => m.trim()) 
        : [];

      setFormData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phoneNumber: profile.phone_number || '',
        email: profile.email || '',
        uid: profile.uid || '',
        majors: profile.majors || '',
        selectedMajors: majorsArray,
        minors: profile.minors || '',
        houseMembership: profile.house_membership,
        race: profile.race,
        pronouns: profile.pronouns,
        livingType: profile.living_type,
        gender: profile.gender,
        sexualOrientation: profile.sexual_orientation,
        expectedGraduation: profile.expected_graduation,
        pledgeClass: profile.pledge_class,
      });
    }
  }, [profile, isEditing]);

  /**
   * Update a single form field
   */
  const updateField = useCallback(<K extends keyof ProfileFormData>(
    field: K,
    value: ProfileFormData[K]
  ) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Special handling: sync selectedMajors with majors string
      if (field === 'selectedMajors' && Array.isArray(value)) {
        updated.majors = value.join(', ');
      } else if (field === 'majors' && typeof value === 'string') {
        updated.selectedMajors = value
          .split(',')
          .map(m => m.trim())
          .filter(m => m);
      }
      
      return updated;
    });
  }, []);

  /**
   * Validate form data before submission
   */
  const validateForm = useCallback((): { isValid: boolean; error?: string } => {
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      return {
        isValid: false,
        error: 'First name and last name are required.',
      };
    }

    // Phone number validation (optional but must be valid if provided)
    if (formData.phoneNumber?.trim()) {
      const phonePattern = /^\+?[\d\s\-\(\)]+$/;
      if (!phonePattern.test(formData.phoneNumber)) {
        return {
          isValid: false,
          error: 'Please enter a valid phone number.',
        };
      }
    }

    // Email validation (optional but must be valid if provided)
    if (formData.email?.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formData.email)) {
        return {
          isValid: false,
          error: 'Please enter a valid email address.',
        };
      }
    }

    return { isValid: true };
  }, [formData]);

  /**
   * Save profile updates to database
   */
  const saveProfile = useCallback(async () => {
    // Check edit cooldown
    if (!canEdit) {
      Alert.alert(
        'Profile Edit Limit',
        `You can only edit your profile once per week. You can edit again in ${daysUntilEdit} day${daysUntilEdit === 1 ? '' : 's'} (${formatDateInEST(nextEditDate!.toISOString())}).`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    // Validate form
    const validation = validateForm();
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.error);
      return;
    }

    setSaving(true);

    try {
      // Check authentication
      const authResult = await checkAuthentication();
      if (!authResult.isAuthenticated) {
        handleAuthenticationRedirect();
        return;
      }

      const user = authResult.user;

      // Prepare update data
      const updateData = {
        first_name: formData.firstName!.trim(),
        last_name: formData.lastName!.trim(),
        phone_number: formData.phoneNumber?.trim() || null,
        email: formData.email?.trim() || null,
        uid: formData.uid?.trim() || null,
        majors: formData.majors?.trim() || null,
        minors: formData.minors?.trim() || null,
        house_membership: formData.houseMembership || null,
        race: formData.race || null,
        pronouns: formData.pronouns || null,
        living_type: formData.livingType || null,
        gender: formData.gender || null,
        sexual_orientation: formData.sexualOrientation || null,
        expected_graduation: formData.expectedGraduation || null,
        pledge_class: formData.pledgeClass || null,
        last_profile_update: new Date().toISOString(),
      };

      // Update database
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) {
        console.error('Profile update error:', error);
        throw new Error('Could not update profile. Please try again.');
      }

      // Success!
      setIsEditing(false);
      Alert.alert(
        'Saved',
        'Your profile has been updated successfully! You can edit your profile again in 7 days.'
      );

      // Refresh account data if callback provided
      if (onSaveSuccess) {
        await onSaveSuccess();
      }

    } catch (error) {
      console.error('Unexpected error in saveProfile:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  }, [canEdit, daysUntilEdit, nextEditDate, formData, validateForm, onSaveSuccess]);

  /**
   * Cancel editing and reset form
   */
  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setFormData({});
  }, []);

  /**
   * Start editing mode
   */
  const startEdit = useCallback(() => {
    if (!canEdit) {
      Alert.alert(
        'Profile Edit Limit',
        `You can only edit your profile once per week. You can edit again in ${daysUntilEdit} day${daysUntilEdit === 1 ? '' : 's'}.`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    setIsEditing(true);
  }, [canEdit, daysUntilEdit]);

  return {
    isEditing,
    formData,
    canEdit,
    nextEditDate,
    daysUntilEdit,
    updateField,
    saveProfile,
    cancelEdit,
    startEdit,
    saving,
  };
};
