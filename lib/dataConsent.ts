/**
 * Data Consent Manager
 * 
 * Manages user consent for optional data collection
 * Stores preferences securely and provides utilities for checking consent
 */

import { setSecureItem, getSecureItem } from './secureStorage';

export interface ConsentPreferences {
  demographics: boolean;  // Gender, pronouns, race, sexual orientation
  academic: boolean;      // Major, minor, graduation year details
  housing: boolean;       // Living situation, house membership
  analytics: boolean;     // Allow aggregated analytics
  timestamp: number;      // When consent was given
  version: string;        // Privacy policy version
}

const CONSENT_KEY = 'dsp_data_consent';
const CURRENT_PRIVACY_VERSION = '1.0.0';

/**
 * Save user consent preferences
 */
export async function saveConsentPreferences(
  preferences: Omit<ConsentPreferences, 'timestamp' | 'version'>
): Promise<void> {
  const fullPreferences: ConsentPreferences = {
    ...preferences,
    timestamp: Date.now(),
    version: CURRENT_PRIVACY_VERSION,
  };
  
  await setSecureItem(CONSENT_KEY, fullPreferences);
}

/**
 * Get user consent preferences
 */
export async function getConsentPreferences(): Promise<ConsentPreferences | null> {
  return await getSecureItem<ConsentPreferences>(CONSENT_KEY);
}

/**
 * Check if user has given consent for a specific category
 */
export async function hasConsent(category: keyof Omit<ConsentPreferences, 'timestamp' | 'version'>): Promise<boolean> {
  const preferences = await getConsentPreferences();
  if (!preferences) return false;
  return preferences[category] === true;
}

/**
 * Check if user needs to review consent (privacy policy updated)
 */
export async function needsConsentReview(): Promise<boolean> {
  const preferences = await getConsentPreferences();
  if (!preferences) return true;
  return preferences.version !== CURRENT_PRIVACY_VERSION;
}

/**
 * Clear consent (on logout)
 */
export async function clearConsent(): Promise<void> {
  const { deleteSecureItem, STORAGE_KEYS } = await import('./secureStorage');
  // Note: CONSENT_KEY should be added to STORAGE_KEYS if needed
}

/**
 * Get fields that require consent based on field name
 */
export function getRequiredConsentForField(fieldName: string): keyof Omit<ConsentPreferences, 'timestamp' | 'version'> | null {
  // Demographics fields
  if (['gender', 'pronouns', 'race', 'sexual_orientation'].includes(fieldName)) {
    return 'demographics';
  }
  
  // Academic fields (detailed)
  if (['majors', 'minors', 'expected_graduation'].includes(fieldName)) {
    return 'academic';
  }
  
  // Housing fields
  if (['living_type', 'house_membership'].includes(fieldName)) {
    return 'housing';
  }
  
  return null;
}

/**
 * Check if field can be collected based on consent
 */
export async function canCollectField(fieldName: string): Promise<boolean> {
  const requiredConsent = getRequiredConsentForField(fieldName);
  
  // If field doesn't require consent, it can always be collected
  if (!requiredConsent) return true;
  
  // Check if user has given consent for this category
  return await hasConsent(requiredConsent);
}

/**
 * Filter profile data based on consent
 * Removes fields user hasn't consented to share
 */
export async function filterDataByConsent<T extends Record<string, any>>(data: T): Promise<Partial<T>> {
  const preferences = await getConsentPreferences();
  
  // If no preferences, only include non-sensitive fields
  if (!preferences) {
    const filtered: Partial<T> = {};
    for (const [key, value] of Object.entries(data)) {
      const requiredConsent = getRequiredConsentForField(key);
      if (!requiredConsent) {
        filtered[key as keyof T] = value;
      }
    }
    return filtered;
  }
  
  // Filter based on preferences
  const filtered: Partial<T> = {};
  for (const [key, value] of Object.entries(data)) {
    const requiredConsent = getRequiredConsentForField(key);
    
    if (!requiredConsent) {
      // Non-sensitive field, always include
      filtered[key as keyof T] = value;
    } else if (preferences[requiredConsent]) {
      // User has consented to this category
      filtered[key as keyof T] = value;
    }
    // Otherwise, exclude the field
  }
  
  return filtered;
}

/**
 * Get list of sensitive fields user can edit based on consent
 */
export async function getEditableFields(): Promise<string[]> {
  const preferences = await getConsentPreferences();
  
  const allSensitiveFields = [
    'gender',
    'pronouns',
    'race',
    'sexual_orientation',
    'majors',
    'minors',
    'expected_graduation',
    'living_type',
    'house_membership',
  ];
  
  if (!preferences) return [];
  
  const editable: string[] = [];
  
  for (const field of allSensitiveFields) {
    const requiredConsent = getRequiredConsentForField(field);
    if (requiredConsent && preferences[requiredConsent]) {
      editable.push(field);
    }
  }
  
  return editable;
}

/**
 * Show consent modal if needed (first time or policy updated)
 */
export async function shouldShowConsentModal(): Promise<boolean> {
  return await needsConsentReview();
}
