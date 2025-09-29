/**
 * Production-safe logging utility
 * Prevents sensitive data exposure in production builds
 */

import Constants from 'expo-constants'

const isDevelopment = __DEV__ || Constants.expoConfig?.extra?.environment === 'development'

export const logger = {
  log: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`[LOG] ${message}`, ...args)
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  },
  
  error: (message: string, error?: any) => {
    if (isDevelopment) {
      console.error(`[ERROR] ${message}`, error)
    }
    // In production, you might want to send to crash analytics instead
    // crashlytics().recordError(error)
  },
  
  info: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.info(`[INFO] ${message}`, ...args)
    }
  }
}

// Sanitize sensitive data before logging
export const sanitizeForLog = (data: any): any => {
  if (!isDevelopment) return '[REDACTED]'
  
  if (typeof data !== 'object' || data === null) return data
  
  const sensitiveKeys = [
    'password', 'token', 'key', 'secret', 'auth', 'credential',
    'email', 'phone', 'ssn', 'private_key'
  ]
  
  const sanitized = { ...data }
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]'
    }
  }
  
  return sanitized
}
