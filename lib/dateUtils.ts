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
  // Validate inputs
  if (isNaN(dateValue.getTime()) || isNaN(timeValue.getTime())) {
    throw new Error('Invalid date or time provided to combineDateAndTime');
  }
  
  const combined = new Date(
    dateValue.getFullYear(),
    dateValue.getMonth(),
    dateValue.getDate(),
    timeValue.getHours(),
    timeValue.getMinutes()
  );
  
  // Validate the result
  if (isNaN(combined.getTime())) {
    throw new Error('Failed to combine date and time - result is invalid');
  }
  
  return combined;
};

/**
 * Rounds a date to the nearest minute (useful for time consistency)
 */
export const roundToNearestMinute = (date: Date): Date => {
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date provided to roundToNearestMinute');
  }
  
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
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date provided to getESTISOString');
  }
  
  // Use Intl.DateTimeFormat to get parts in EST timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  const day = parts.find(part => part.type === 'day')?.value;
  const hour = parts.find(part => part.type === 'hour')?.value;
  const minute = parts.find(part => part.type === 'minute')?.value;
  const second = parts.find(part => part.type === 'second')?.value;
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
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

/**
 * Formats a date and time for display in EST timezone
 * Returns format: "Mon, Jan 15, 2025, 7:30 PM"
 */
export const formatDateTimeInEST = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};
