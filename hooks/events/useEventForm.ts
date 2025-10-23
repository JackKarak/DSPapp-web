/**
 * Custom hook for event form management
 * Handles form state, validation, and submission with debouncing
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { combineDateAndTime, getESTISOString, roundToNearestMinute } from '../../lib/dateUtils';
import {
  validateTitle,
  validateLocation,
  validatePointType,
  validateTimeRange,
  debounce,
  ValidationResult
} from '../../lib/formValidation';
import { getInitialTime, REDIRECT_DELAY } from '../../constants/formConstants';

export type FormMode = 'event' | 'points';

export interface FormData {
  title: string;
  description: string;
  location: string;
  pointType: string;
  startDate: Date;
  startTime: Date;
  endDate: Date;
  endTime: Date;
  isRegisterable: boolean;
  availableToPledges: boolean;
  isMultiDay: boolean;
  awardPoints: boolean;
}

export interface FormErrors {
  title?: string;
  location?: string;
  pointType?: string;
  time?: string;
}

const getInitialFormState = (): FormData => ({
  title: '',
  description: '',
  location: '',
  pointType: '',
  startDate: new Date(),
  startTime: getInitialTime(1),
  endDate: new Date(),
  endTime: getInitialTime(2),
  isRegisterable: true,
  availableToPledges: true,
  isMultiDay: false,
  awardPoints: true,
});

export const useEventForm = () => {
  const [mode, setMode] = useState<FormMode>('event');
  const [formData, setFormData] = useState<FormData>(getInitialFormState());
  const [errors, setErrors] = useState<FormErrors>({});
  const [globalError, setGlobalError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  // Use ref to avoid recreating debounced function
  const debouncedValidateRef = useRef(
    debounce((field: keyof FormData, value: any, currentMode: FormMode, awardPoints: boolean) => {
      const newErrors = { ...errors };
      
      switch (field) {
        case 'title': {
          const result = validateTitle(value);
          if (result.isValid) {
            delete newErrors.title;
          } else {
            newErrors.title = result.error;
          }
          break;
        }
        case 'location': {
          const result = validateLocation(value, currentMode === 'event');
          if (result.isValid) {
            delete newErrors.location;
          } else {
            newErrors.location = result.error;
          }
          break;
        }
        case 'pointType': {
          const result = validatePointType(value, awardPoints);
          if (result.isValid) {
            delete newErrors.pointType;
          } else {
            newErrors.pointType = result.error;
          }
          break;
        }
      }
      
      setErrors(newErrors);
    }, 300)
  );

  // Update form field with optional validation
  const updateField = useCallback((field: keyof FormData, value: any, shouldValidate: boolean = true) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (shouldValidate && (field === 'title' || field === 'location' || field === 'pointType')) {
      debouncedValidateRef.current(field, value, mode, formData.awardPoints);
    }
  }, [mode, formData.awardPoints]);

  // Validate entire form
  const validateForm = useCallback((): string | null => {
    const newErrors: FormErrors = {};
    
    const titleResult = validateTitle(formData.title);
    if (!titleResult.isValid) {
      newErrors.title = titleResult.error;
    }
    
    const locationResult = validateLocation(formData.location, mode === 'event');
    if (!locationResult.isValid) {
      newErrors.location = locationResult.error;
    }
    
    const pointTypeResult = validatePointType(formData.pointType, formData.awardPoints);
    if (!pointTypeResult.isValid) {
      newErrors.pointType = pointTypeResult.error;
    }

    // Validate time ordering for events
    if (mode === 'event') {
      const combinedStart = combineDateAndTime(formData.startDate, formData.startTime);
      const finalEndDate = formData.isMultiDay ? formData.endDate : formData.startDate;
      const combinedEnd = combineDateAndTime(finalEndDate, formData.endTime);
      
      const timeResult = validateTimeRange(combinedStart, combinedEnd);
      if (!timeResult.isValid) {
        newErrors.time = timeResult.error;
      }
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      return 'Please fix the validation errors above before submitting';
    }
    
    return null;
  }, [formData, mode]);

  // Handle mode change
  const handleModeChange = useCallback((newMode: FormMode) => {
    setMode(newMode);
    setErrors({});
    setGlobalError('');
    
    if (newMode === 'points') {
      setFormData(prev => ({
        ...prev,
        location: '',
        isRegisterable: false,
        isMultiDay: false,
        awardPoints: true,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        isRegisterable: true,
        awardPoints: true,
      }));
    }
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    setGlobalError('');
    Keyboard.dismiss();
    
    const validationError = validateForm();
    if (validationError) {
      setGlobalError(validationError);
      return;
    }

    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoading(false);
        setGlobalError('Authentication failed. Please log in and try again.');
        setTimeout(() => router.replace('/(auth)/login'), REDIRECT_DELAY);
        return;
      }

      const { 
        startDate, startTime, endDate, endTime, isMultiDay, 
        title, description, location, pointType, awardPoints, 
        isRegisterable, availableToPledges 
      } = formData;

      let startTimeString: string;
      let endTimeString: string;

      if (mode === 'event') {
        const combinedStart = combineDateAndTime(startDate, startTime);
        const finalEndDate = isMultiDay ? endDate : startDate;
        const combinedEnd = combineDateAndTime(finalEndDate, endTime);
        
        const roundedStart = roundToNearestMinute(combinedStart);
        const roundedEnd = roundToNearestMinute(combinedEnd);
        startTimeString = getESTISOString(roundedStart);
        endTimeString = getESTISOString(roundedEnd);
      } else {
        const deadline = combineDateAndTime(endDate, new Date());
        startTimeString = getESTISOString(deadline);
        endTimeString = getESTISOString(deadline);
      }

      const { error } = await supabase.from('events').insert({
        title,
        description,
        location: mode === 'points' ? '' : location,
        point_type: awardPoints ? pointType : 'No Point',
        point_value: awardPoints ? 1 : 0,
        start_time: startTimeString,
        end_time: endTimeString,
        created_by: user.id,
        is_registerable: mode === 'event' ? isRegisterable : false,
        available_to_pledges: availableToPledges,
        is_non_event: mode === 'points',
        status: 'pending',
      });

      if (error) {
        console.error('Event creation error:', error);
        setGlobalError(`Database error: ${error.message}. Please try again or contact support.`);
      } else {
        setShowSuccess(true);
        setTimeout(() => {
          setFormData(getInitialFormState());
          setShowSuccess(false);
          router.back();
        }, 1500);
      }
    } catch (error) {
      console.error('Unexpected error creating event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setGlobalError(`Unexpected error: ${errorMessage}. Please try again.`);
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm, router, mode]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData(getInitialFormState());
    setErrors({});
    setGlobalError('');
  }, []);

  return {
    mode,
    formData,
    errors,
    globalError,
    loading,
    showSuccess,
    updateField,
    handleModeChange,
    handleSubmit,
    resetForm,
    setGlobalError,
  };
};
