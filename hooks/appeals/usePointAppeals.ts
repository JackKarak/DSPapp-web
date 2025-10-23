/**
 * usePointAppeals Hook
 * 
 * Purpose: Handle point appeal submission and state management
 * 
 * This hook manages all functionality related to appealing for points:
 * - Appeal form state
 * - URL validation
 * - Submission to database
 * - Duplicate detection
 * 
 * Impact:
 * - Centralizes appeal logic
 * - Provides reusable appeal functionality
 * - Consistent validation across the app
 * - Better error handling
 */

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { checkAuthentication, handleAuthenticationRedirect } from '../../lib/auth';
import { Event } from '../../types/account';
import { AppealData } from '../../types/hooks';
import { VALIDATION_RULES } from '../../constants/accountConstants';

interface UsePointAppealsReturn {
  submitting: boolean;
  selectedEvent: Event | null;
  appealData: AppealData;
  updateReason: (reason: string) => void;
  updatePictureUrl: (url: string) => void;
  updateAppealData: (data: Partial<AppealData>) => void;
  submitAppeal: () => Promise<void>;
  selectEvent: (event: Event) => void;
  clearSelection: () => void;
  resetForm: () => void;
}

/**
 * Validate URL format
 */
const isValidUrl = (url: string): boolean => {
  if (!url.trim()) return false;
  
  try {
    const urlObj = new URL(url.trim());
    // Must be http or https protocol
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

/**
 * Custom hook for managing point appeals
 * 
 * @param {() => Promise<void>} onSubmitSuccess - Callback after successful submission
 * @returns {UsePointAppealsReturn} Appeal state and management functions
 * 
 * @example
 * ```tsx
 * const appeals = usePointAppeals(refreshData);
 * 
 * <PointAppealModal
 *   visible={isVisible}
 *   {...appeals}
 * />
 * ```
 */
export const usePointAppeals = (
  onSubmitSuccess?: () => Promise<void>
): UsePointAppealsReturn => {
  const [submitting, setSubmitting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [appealData, setAppealData] = useState<AppealData>({
    reason: '',
    pictureUrl: '',
  });

  /**
   * Update appeal reason
   */
  const updateReason = useCallback((reason: string) => {
    setAppealData(prev => ({ ...prev, reason }));
  }, []);

  /**
   * Update picture URL
   */
  const updatePictureUrl = useCallback((url: string) => {
    setAppealData(prev => ({ ...prev, pictureUrl: url }));
  }, []);

  /**
   * Update multiple appeal data fields at once
   */
  const updateAppealData = useCallback((data: Partial<AppealData>) => {
    setAppealData(prev => ({ ...prev, ...data }));
  }, []);

  /**
   * Validate appeal form before submission
   */
  const validateAppeal = useCallback((): { isValid: boolean; error?: string } => {
    if (!selectedEvent) {
      return {
        isValid: false,
        error: 'No event selected for appeal.',
      };
    }

    if (!appealData.reason.trim()) {
      return {
        isValid: false,
        error: 'Please provide a reason for your appeal.',
      };
    }

    if (!appealData.pictureUrl.trim()) {
      return {
        isValid: false,
        error: 'Please provide a picture URL as evidence for your appeal.',
      };
    }

    if (!isValidUrl(appealData.pictureUrl)) {
      return {
        isValid: false,
        error: 'Please provide a valid picture URL (must start with http:// or https://).',
      };
    }

    // Additional URL validation from constants if available
    if (VALIDATION_RULES?.URL_PATTERN && !VALIDATION_RULES.URL_PATTERN.test(appealData.pictureUrl)) {
      return {
        isValid: false,
        error: 'Invalid URL format. Please provide a valid https:// URL.',
      };
    }

    return { isValid: true };
  }, [selectedEvent, appealData]);

  /**
   * Submit point appeal to database
   */
  const submitAppeal = useCallback(async () => {
    if (submitting) return; // Prevent double submission

    // Validate form
    const validation = validateAppeal();
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.error);
      return;
    }

    setSubmitting(true);

    try {
      // Check authentication
      const authResult = await checkAuthentication();
      if (!authResult.isAuthenticated) {
        handleAuthenticationRedirect();
        return;
      }

      // Prepare appeal submission
      const appealSubmission = {
        user_id: authResult.user.id,
        event_id: selectedEvent!.id,
        appeal_reason: appealData.reason.trim(),
        picture_url: appealData.pictureUrl.trim(),
      };

      // Submit to database
      const { error } = await supabase
        .from('point_appeal')
        .insert(appealSubmission);

      if (error) {
        // Handle duplicate submission
        if (error.code === '23505') {
          Alert.alert(
            'Already Submitted',
            'You have already submitted an appeal for this event.'
          );
          return;
        }

        console.error('Point appeal submission error:', error);
        throw new Error('Could not submit appeal. Please try again.');
      }

      // Success!
      Alert.alert(
        'Success',
        'Your point appeal has been submitted for review.'
      );

      // Reset form
      setAppealData({ reason: '', pictureUrl: '' });
      setSelectedEvent(null);

      // Call success callback to refresh data
      if (onSubmitSuccess) {
        await onSubmitSuccess();
      }

    } catch (error) {
      console.error('Point appeal submission error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, selectedEvent, appealData, validateAppeal, onSubmitSuccess]);

  /**
   * Select an event for appeal
   */
  const selectEvent = useCallback((event: Event) => {
    setSelectedEvent(event);
  }, []);

  /**
   * Clear selected event
   */
  const clearSelection = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  /**
   * Reset entire form to initial state
   */
  const resetForm = useCallback(() => {
    setAppealData({ reason: '', pictureUrl: '' });
    setSelectedEvent(null);
  }, []);

  return {
    submitting,
    selectedEvent,
    appealData,
    updateReason,
    updatePictureUrl,
    updateAppealData,
    submitAppeal,
    selectEvent,
    clearSelection,
    resetForm,
  };
};
