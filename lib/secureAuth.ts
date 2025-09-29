/**
 * Secure authentication utilities with enhanced error handling
 */

import { Alert } from 'react-native'
import { supabase } from './supabase'
import { logger, sanitizeForLog } from './logger'

export interface AuthResult {
  isAuthenticated: boolean
  user: any | null
  error?: string
}

export const checkAuthentication = async (): Promise<AuthResult> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      logger.error('Authentication check failed', sanitizeForLog(error))
      return { isAuthenticated: false, user: null, error: 'Authentication failed' }
    }
    
    if (!user) {
      return { isAuthenticated: false, user: null, error: 'No authenticated user' }
    }

    // Verify user exists in database
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('user_id, email, role, first_name, last_name')
      .eq('user_id', user.id)
      .single()

    if (dbError || !dbUser) {
      logger.error('Database user verification failed', sanitizeForLog(dbError))
      return { isAuthenticated: false, user: null, error: 'User not found in database' }
    }

    return { isAuthenticated: true, user: { ...user, ...dbUser } }
    
  } catch (error) {
    logger.error('Unexpected authentication error', sanitizeForLog(error))
    return { isAuthenticated: false, user: null, error: 'Unexpected authentication error' }
  }
}

export const handleAuthenticationRedirect = (message?: string) => {
  const defaultMessage = 'Authentication required. Please log in to continue.'
  Alert.alert(
    'Authentication Required',
    message || defaultMessage,
    [
      {
        text: 'OK',
        onPress: () => {
          // Clear any stored session data
          supabase.auth.signOut()
        }
      }
    ]
  )
}

export const secureSignOut = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      logger.error('Sign out failed', sanitizeForLog(error))
      return { success: false, error: 'Failed to sign out' }
    }
    
    return { success: true }
    
  } catch (error) {
    logger.error('Unexpected sign out error', sanitizeForLog(error))
    return { success: false, error: 'Unexpected error during sign out' }
  }
}

// Rate limiting for sensitive operations
const rateLimiter = new Map<string, number>()

export const checkRateLimit = (operation: string, limitMs: number = 60000): boolean => {
  const now = Date.now()
  const lastAttempt = rateLimiter.get(operation)
  
  if (lastAttempt && (now - lastAttempt) < limitMs) {
    return false // Rate limited
  }
  
  rateLimiter.set(operation, now)
  return true
}

export const validateInput = (input: string, type: 'email' | 'phone' | 'password'): boolean => {
  switch (type) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)
    case 'phone':
      return /^\d{10,15}$/.test(input.replace(/\D/g, ''))
    case 'password':
      return input.length >= 8 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(input)
    default:
      return false
  }
}
