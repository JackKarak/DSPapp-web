/**
 * useEventFeedback Hook
 * 
 * Purpose: Handle event feedback submission and state management
 * 
 * This hook manages all functionality related to submitting feedback for events:
 * - Feedback form state
 * - Tracking submitted feedback
 * - Form validation
 * - Database submission
 * 
 * Impact:
 * - Centralizes feedback logic
 * - Prevents duplicate feedback submissions
 * - Consistent validation
 * - Better user experience with submission tracking
 */

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { checkAuthentication, handleAuthenticationRedirect } from '../../lib/auth';
import { Event } from '../../types/account';
import { FeedbackData } from '../../types/hooks';

interface UseEventFeedbackReturn {
  submitting: boolean;
  selectedEvent: Event | null;
  submittedEvents: Set<string>;
  feedbackData: FeedbackData;
  updateRating: (rating: number) => void;
  updateWouldAttendAgain: (value: boolean | null) => void;
  updateWellOrganized: (value: boolean | null) => void;
  updateComments: (comments: string) => void;
  updateFeedbackData: (data: Partial<FeedbackData>) => void;
  submitFeedback: () => Promise<void>;
  selectEvent: (event: Event) => void;
  clearSelection: () => void;
  resetForm: () => void;
  hasSubmittedFeedback: (eventId: string) => boolean;
  markEventAsSubmitted: (eventId: string) => void;
}

/**
 * Initial feedback form state
 */
const INITIAL_FEEDBACK_DATA: FeedbackData = {
  rating: 5,
  would_attend_again: null,
  well_organized: null,
  comments: '',
};

/**
 * Custom hook for managing event feedback
 * 
 * @param {Set<string>} initialSubmittedEvents - Events that already have feedback
 * @returns {UseEventFeedbackReturn} Feedback state and management functions
 * 
 * @example
 * ```tsx
 * const feedback = useEventFeedback(submittedFeedbackEvents);
 * 
 * <EventFeedbackModal
 *   visible={isVisible}
 *   {...feedback}
 * />
 * ```
 */
export const useEventFeedback = (
  initialSubmittedEvents?: Set<string>
): UseEventFeedbackReturn => {
  const [submitting, setSubmitting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [submittedEvents, setSubmittedEvents] = useState<Set<string>>(
    initialSubmittedEvents || new Set()
  );
  const [feedbackData, setFeedbackData] = useState<FeedbackData>(INITIAL_FEEDBACK_DATA);

  /**
   * Update rating (1-5)
   */
  const updateRating = useCallback((rating: number) => {
    // Clamp rating between 1 and 5
    const clampedRating = Math.max(1, Math.min(5, rating));
    setFeedbackData(prev => ({ ...prev, rating: clampedRating }));
  }, []);

  /**
   * Update "would attend again" answer
   */
  const updateWouldAttendAgain = useCallback((value: boolean | null) => {
    setFeedbackData(prev => ({ ...prev, would_attend_again: value }));
  }, []);

  /**
   * Update "well organized" answer
   */
  const updateWellOrganized = useCallback((value: boolean | null) => {
    setFeedbackData(prev => ({ ...prev, well_organized: value }));
  }, []);

  /**
   * Update comments
   */
  const updateComments = useCallback((comments: string) => {
    setFeedbackData(prev => ({ ...prev, comments }));
  }, []);

  /**
   * Update multiple feedback data fields at once
   */
  const updateFeedbackData = useCallback((data: Partial<FeedbackData>) => {
    setFeedbackData(prev => ({ ...prev, ...data }));
  }, []);

  /**
   * Validate feedback form before submission
   */
  const validateFeedback = useCallback((): { isValid: boolean; error?: string } => {
    if (!selectedEvent) {
      return {
        isValid: false,
        error: 'No event selected for feedback.',
      };
    }

    if (feedbackData.rating < 1 || feedbackData.rating > 5) {
      return {
        isValid: false,
        error: 'Please provide a rating between 1 and 5.',
      };
    }

    if (feedbackData.would_attend_again === null || feedbackData.well_organized === null) {
      return {
        isValid: false,
        error: 'Please answer all required questions.',
      };
    }

    return { isValid: true };
  }, [selectedEvent, feedbackData]);

  /**
   * Submit event feedback to database
   */
  const submitFeedback = useCallback(async () => {
    if (submitting) return; // Prevent double submission

    // Validate form
    const validation = validateFeedback();
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.error);
      return;
    }

    setSubmitting(true);

    try {
      // Check authentication
      const authResult = await checkAuthentication();
      if (!authResult.isAuthenticated) {
        handleAuthenticationRedirect('You must be logged in to submit feedback.');
        return;
      }

      // Prepare feedback submission
      const feedbackSubmission = {
        user_id: authResult.user.id,
        event_id: selectedEvent!.id,
        rating: feedbackData.rating,
        would_attend_again: feedbackData.would_attend_again,
        well_organized: feedbackData.well_organized,
        comments: feedbackData.comments?.trim() || null,
        created_at: new Date().toISOString(),
      };

      // Submit to database
      const { error } = await supabase
        .from('event_feedback')
        .insert(feedbackSubmission);

      if (error) {
        // Handle duplicate submission
        if (error.code === '23505') {
          Alert.alert(
            'Already Submitted',
            'You have already submitted feedback for this event.'
          );
          // Mark as submitted anyway
          setSubmittedEvents(prev => new Set([...prev, selectedEvent!.id]));
          return;
        }

        console.error('Event feedback submission error:', error);
        throw new Error('Could not submit feedback. Please try again.');
      }

      // Success!
      Alert.alert(
        'Thanks!',
        'Your event feedback was submitted successfully.'
      );

      // Mark event as having submitted feedback
      setSubmittedEvents(prev => new Set([...prev, selectedEvent!.id]));

      // Reset form
      setFeedbackData(INITIAL_FEEDBACK_DATA);
      setSelectedEvent(null);

    } catch (error) {
      console.error('Event feedback submission error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, selectedEvent, feedbackData, validateFeedback]);

  /**
   * Select an event for feedback
   */
  const selectEvent = useCallback((event: Event) => {
    setSelectedEvent(event);
    // Reset form data when selecting new event
    setFeedbackData(INITIAL_FEEDBACK_DATA);
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
    setFeedbackData(INITIAL_FEEDBACK_DATA);
    setSelectedEvent(null);
  }, []);

  /**
   * Check if feedback has been submitted for an event
   */
  const hasSubmittedFeedback = useCallback((eventId: string): boolean => {
    return submittedEvents.has(eventId);
  }, [submittedEvents]);

  /**
   * Manually mark an event as having submitted feedback
   * Useful when loading from database
   */
  const markEventAsSubmitted = useCallback((eventId: string) => {
    setSubmittedEvents(prev => new Set([...prev, eventId]));
  }, []);

  return {
    submitting,
    selectedEvent,
    submittedEvents,
    feedbackData,
    updateRating,
    updateWouldAttendAgain,
    updateWellOrganized,
    updateComments,
    updateFeedbackData,
    submitFeedback,
    selectEvent,
    clearSelection,
    resetForm,
    hasSubmittedFeedback,
    markEventAsSubmitted,
  };
};
