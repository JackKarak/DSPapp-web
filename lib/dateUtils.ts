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
 * Converts a Date to EST timezone string in ISO 8601 format for database storage
 * Returns format compatible with PostgreSQL TIMESTAMPTZ: YYYY-MM-DDTHH:MM:SS-05:00
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
  
  // Determine if DST is in effect for EST/EDT offset
  const isDST = isDateInDST(date);
  const offset = isDST ? '-04:00' : '-05:00'; // EDT or EST
  
  // Return ISO 8601 format with timezone offset
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
};

/**
 * Checks if a date falls within Daylight Saving Time in Eastern timezone
 */
const isDateInDST = (date: Date): boolean => {
  // DST in US: Second Sunday in March to First Sunday in November
  const year = date.getFullYear();
  
  // Get second Sunday in March
  const marchFirst = new Date(year, 2, 1); // March is month 2 (0-indexed)
  const marchFirstDay = marchFirst.getDay();
  const dstStart = new Date(year, 2, (14 - marchFirstDay) % 7 + 8, 2, 0, 0); // 2 AM EST
  
  // Get first Sunday in November
  const novFirst = new Date(year, 10, 1); // November is month 10
  const novFirstDay = novFirst.getDay();
  const dstEnd = new Date(year, 10, (7 - novFirstDay) % 7 + 1, 2, 0, 0); // 2 AM EDT
  
  return date >= dstStart && date < dstEnd;
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
