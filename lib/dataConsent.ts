/**
 * Data Consent Manager
 * 
 * Manages user consent for optional data collection
 * Stores preferences securely in BOTH local storage AND Supabase database
 */

import { setSecureItem, getSecureItem } from './secureStorage';
import { supabase } from './supabase';

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
 * Save user consent preferences to BOTH local storage AND Supabase
 */
export async function saveConsentPreferences(
  preferences: Omit<ConsentPreferences, 'timestamp' | 'version'>
): Promise<void> {
  const fullPreferences: ConsentPreferences = {
    ...preferences,
    timestamp: Date.now(),
    version: CURRENT_PRIVACY_VERSION,
  };
  
  // Save to local storage
  await setSecureItem(CONSENT_KEY, fullPreferences);
  
  // Save to Supabase database
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from('users')
        .update({
          consent_analytics: preferences.analytics,
          consent_demographics: preferences.demographics,
          consent_academic: preferences.academic,
          consent_housing: preferences.housing,
          consent_updated_at: new Date().toISOString(),
          privacy_policy_version: CURRENT_PRIVACY_VERSION,
        })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Failed to save consent to database:', error);
        // Don't throw - local storage save succeeded
      }
    }
  } catch (error) {
    console.error('Error saving consent to Supabase:', error);
    // Don't throw - local storage save succeeded
  }
}

/**
 * Get user consent preferences from local storage OR Supabase
 */
export async function getConsentPreferences(): Promise<ConsentPreferences | null> {
  // Try local storage first
  const localPreferences = await getSecureItem<ConsentPreferences>(CONSENT_KEY);
  
  if (localPreferences) {
    return localPreferences;
  }
  
  // Fallback to Supabase if not in local storage
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase
        .from('users')
        .select('consent_analytics, consent_demographics, consent_academic, consent_housing, consent_updated_at, privacy_policy_version')
        .eq('user_id', user.id)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      // Convert database format to local format
      const preferences: ConsentPreferences = {
        analytics: data.consent_analytics || false,
        demographics: data.consent_demographics || false,
        academic: data.consent_academic || false,
        housing: data.consent_housing || false,
        timestamp: data.consent_updated_at ? new Date(data.consent_updated_at).getTime() : Date.now(),
        version: data.privacy_policy_version || '1.0.0',
      };
      
      // Cache in local storage for faster access
      await setSecureItem(CONSENT_KEY, preferences);
      
      return preferences;
    }
  } catch (error) {
    console.error('Error fetching consent from Supabase:', error);
  }
  
  return null;
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
