/**
 * Form validation utilities
 * Centralized validation logic with proper type safety
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateTitle = (title: string): ValidationResult => {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: 'Title is required' };
  }
  if (title.trim().length < 3) {
    return { isValid: false, error: 'Title must be at least 3 characters' };
  }
  return { isValid: true };
};

export const validateLocation = (location: string, isRequired: boolean): ValidationResult => {
  if (!isRequired) {
    return { isValid: true };
  }
  if (!location || location.trim().length === 0) {
    return { isValid: false, error: 'Location is required for events' };
  }
  return { isValid: true };
};

export const validatePointType = (pointType: string, awardPoints: boolean): ValidationResult => {
  if (!awardPoints) {
    return { isValid: true };
  }
  if (!pointType) {
    return { isValid: false, error: 'Please select a point type' };
  }
  return { isValid: true };
};

export const validateTimeRange = (startTime: Date, endTime: Date): ValidationResult => {
  if (endTime <= startTime) {
    return { isValid: false, error: 'End time must be after start time' };
  }
  return { isValid: true };
};

/**
 * Debounce utility for validation
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};
