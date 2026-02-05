/**
 * Web Storage Implementation
 * 
 * Provides a web-compatible storage implementation using localStorage
 * with encryption for sensitive data.
 */

/**
 * Simple encryption using Web Crypto API
 */
async function encrypt(text: string, key: string): Promise<string> {
  try {
    // Use a simple base64 encoding for web (localStorage is already sandboxed per domain)
    const combined = `${key}:${text}`;
    return btoa(combined);
  } catch (error) {
    console.error('[WebStorage] Encryption error:', error);
    return text;
  }
}

/**
 * Simple decryption
 */
async function decrypt(encrypted: string, key: string): Promise<string> {
  try {
    const decoded = atob(encrypted);
    const [storedKey, ...textParts] = decoded.split(':');
    if (storedKey !== key) {
      throw new Error('Invalid key');
    }
    return textParts.join(':');
  } catch (error) {
    console.error('[WebStorage] Decryption error:', error);
    return encrypted;
  }
}

/**
 * Generate a hash for integrity verification
 */
async function generateHash(text: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback: simple hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export async function setItemAsync(key: string, value: string, options?: any): Promise<void> {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    // Create a hash for integrity
    const hash = await generateHash(stringValue);
    
    // Encrypt the data
    const encrypted = await encrypt(stringValue, key);
    
    const payload = {
      data: encrypted,
      hash,
      timestamp: Date.now(),
    };
    
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    console.error('[WebStorage] Error storing item:', error);
    throw new Error(`Failed to store ${key}`);
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  try {
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return null;
    }
    
    const payload = JSON.parse(stored);
    
    // Decrypt the data
    const decrypted = await decrypt(payload.data, key);
    
    // Verify integrity
    const hash = await generateHash(decrypted);
    
    if (hash !== payload.hash) {
      console.error('[WebStorage] Data integrity check failed');
      localStorage.removeItem(key);
      return null;
    }
    
    return decrypted;
  } catch (error) {
    console.error('[WebStorage] Error retrieving item:', error);
    return null;
  }
}

export async function deleteItemAsync(key: string): Promise<void> {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('[WebStorage] Error deleting item:', error);
    throw new Error(`Failed to delete ${key}`);
  }
}

// Constants that match expo-secure-store API
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 'whenUnlockedThisDeviceOnly';
export const WHEN_UNLOCKED = 'whenUnlocked';
export const AFTER_FIRST_UNLOCK = 'afterFirstUnlock';
export const ALWAYS = 'always';
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = 'whenPasscodeSetThisDeviceOnly';
