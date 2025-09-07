// Utility functions for consistent date/time handling across the app

/**
 * Converts a local Date object to ISO string while preserving the local time
 * This prevents timezone conversion issues when storing times that should remain in local timezone
 */
export const getLocalISOString = (date: Date): string => {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString();
};

/**
 * Combines date and time from separate Date objects while preserving timezone
 */
export const combineDateAndTime = (dateValue: Date, timeValue: Date): Date => {
  return new Date(
    dateValue.getFullYear(),
    dateValue.getMonth(),
    dateValue.getDate(),
    timeValue.getHours(),
    timeValue.getMinutes()
  );
};

/**
 * Rounds a date to the nearest minute (useful for time consistency)
 */
export const roundToNearestMinute = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setSeconds(0);
  newDate.setMilliseconds(0);
  return newDate;
};

/**
 * Formats a date for display in the user's local timezone
 */
export const formatLocalDateTime = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...options
  });
};
