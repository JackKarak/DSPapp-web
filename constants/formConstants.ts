/**
 * Form constants and configuration
 * 
 * NOTE: POINT_TYPE_OPTIONS is DEPRECATED as of January 27, 2026
 * Point categories are now dynamically managed in the database.
 * 
 * @deprecated Use the usePointCategories() hook instead:
 * ```typescript
 * import { usePointCategories } from '../hooks/shared/usePointCategories';
 * const { categories } = usePointCategories();
 * ```
 * 
 * This constant is kept only for backward compatibility and will be
 * removed in a future version.
 * 
 * @see hooks/shared/usePointCategories.ts
 * @see docs/features/DYNAMIC_POINT_CATEGORIES.md
 */

// Timing constants
export const KEYBOARD_VERTICAL_OFFSET_IOS = 90;
export const SUCCESS_ANIMATION_DURATION = 1500;
export const VALIDATION_DEBOUNCE_DELAY = 300;
export const REDIRECT_DELAY = 2000;

// Time picker settings
export const TIME_PICKER_INTERVAL = 15; // minutes

// DEPRECATED: Point type options are now dynamic from point_categories table
// Use usePointCategories() hook instead
// This is kept for backward compatibility only
export const POINT_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Brotherhood', value: 'brotherhood' },
  { label: 'Professional', value: 'professional' },
  { label: 'Service', value: 'service' },
  { label: 'Scholarship', value: 'scholarship' },
  { label: 'Health & Wellness', value: 'h&w' },
  { label: 'Fundraising', value: 'fundraising' },
  { label: 'DEI', value: 'dei' }
];

/**
 * Generate initial time rounded to next 15-minute interval
 */
export const getInitialTime = (hoursOffset: number = 1): Date => {
  const time = new Date();
  const hours = time.getHours() + hoursOffset;
  const minutes = Math.ceil(time.getMinutes() / TIME_PICKER_INTERVAL) * TIME_PICKER_INTERVAL;
  
  if (minutes === 60) {
    time.setHours(hours + 1, 0, 0, 0);
  } else {
    time.setHours(hours, minutes, 0, 0);
  }
  
  return time;
};

/**
 * Round time to nearest 15-minute interval
 */
export const roundToNearest15Minutes = (date: Date): Date => {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const remainder = minutes % TIME_PICKER_INTERVAL;
  
  if (remainder === 0) {
    return rounded;
  }
  
  const roundedMinutes = remainder < TIME_PICKER_INTERVAL / 2
    ? minutes - remainder 
    : minutes + (TIME_PICKER_INTERVAL - remainder);
  
  rounded.setMinutes(roundedMinutes, 0, 0);
  return rounded;
};
