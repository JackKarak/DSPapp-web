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
 * Formats a date for display in EST timezone consistently
 */
export const formatDateInEST = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    ...options
  });
};

/**
 * Formats time for display in EST timezone consistently
 */
export const formatTimeInEST = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    ...options
  });
};

/**
 * Gets a Date object that represents the date/time in EST timezone
 * Properly handles timezone conversion without double conversion issues
 */
export const getDateInEST = (dateString: string): Date => {
  // Handle the case where dateString might not include time
  const fullDateString = dateString.includes('T') ? dateString : dateString + 'T00:00:00';
  const date = new Date(fullDateString);
  
  // Return the date as-is since JavaScript Date objects already handle timezone properly
  // when displayed using toLocaleString with timeZone specified
  return date;
};

/**
 * Converts a Date to EST timezone string in database format
 * Returns format: YYYY-MM-DD HH:MM:SS
 */
export const getESTISOString = (date: Date): string => {
  // Use toLocaleString to properly convert to EST timezone
  const estDate = new Date(date.toLocaleString("en-US", {timeZone: "America/New_York"}));
  
  const year = estDate.getFullYear();
  const month = String(estDate.getMonth() + 1).padStart(2, '0');
  const day = String(estDate.getDate()).padStart(2, '0');
  const hours = String(estDate.getHours()).padStart(2, '0');
  const minutes = String(estDate.getMinutes()).padStart(2, '0');
  const seconds = String(estDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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
