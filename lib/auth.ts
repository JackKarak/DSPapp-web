import { Alert } from 'react-native';
import { supabase } from './supabase';

export interface AuthCheckResult {
  user: any | null;
  isAuthenticated: boolean;
  error?: string;
}

/**
 * Checks if the user is authenticated and handles session errors gracefully
 * @returns Promise<AuthCheckResult>
 */
export const checkAuthentication = async (): Promise<AuthCheckResult> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Authentication error:', authError);
      
      // Check for specific session-related errors
      if (
        authError.message?.includes('Auth session missing') || 
        authError.message?.includes('session_not_found') ||
        authError.message?.includes('invalid_session') ||
        authError.message?.includes('JWT expired')
      ) {
        return {
          user: null,
          isAuthenticated: false,
          error: 'Session expired'
        };
      }
      
      return {
        user: null,
        isAuthenticated: false,
        error: authError.message
      };
    }
    
    return {
      user,
      isAuthenticated: !!user,
      error: user ? undefined : 'No user session found'
    };
  } catch (error) {
    console.error('Unexpected authentication error:', error);
    return {
      user: null,
      isAuthenticated: false,
      error: 'Unexpected authentication error'
    };
  }
};

/**
 * Handles authentication redirects with user-friendly messages
 * @param errorMessage Optional custom error message
 */
export const handleAuthenticationRedirect = (errorMessage?: string) => {
  const message = errorMessage || 'Your session has expired. Please log in again.';
  
  Alert.alert(
    'Authentication Required',
    message,
    [
      {
        text: 'OK',
        onPress: async () => {
          // Clear any cached session data
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.error('Error signing out:', signOutError);
          }
          
          // Attempt to navigate to login
          try {
            const { router } = require('expo-router');
            if (router) {
              router.replace('/(auth)/login');
            } else {            }
          } catch (routerError) {
            console.error('Router navigation failed:', routerError);          }
        }
      }
    ],
    { cancelable: false }
  );
};

/**
 * Higher-order function that wraps async functions with authentication checking
 * @param fn The async function to wrap
 * @returns Wrapped function that checks auth before execution
 */
export const withAuthCheck = (fn: (user: any, ...args: any[]) => Promise<any>) => {
  return async (...args: any[]) => {
    const authResult = await checkAuthentication();
    
    if (!authResult.isAuthenticated) {
      handleAuthenticationRedirect(authResult.error);
      return null;
    }
    
    return fn(authResult.user, ...args);
  };
};

/**
 * Refreshes the user session
 * @returns Promise<boolean> - true if refresh successful, false otherwise
 */
export const refreshSession = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Session refresh error:', error);
      return false;
    }
    
    return !!data?.session;
  } catch (error) {
    console.error('Unexpected session refresh error:', error);
    return false;
  }
};
