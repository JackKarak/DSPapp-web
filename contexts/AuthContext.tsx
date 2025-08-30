import { AuthSession } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { checkAuthentication } from '../lib/auth';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: any | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  signOut: async () => {},
  refreshAuth: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = async () => {
    try {
      setIsLoading(true);
      const authResult = await checkAuthentication();
      
      if (authResult.isAuthenticated) {
        setUser(authResult.user);
        // Get the session as well
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } else {
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      console.error('Auth refresh error:', error);
      setUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Unexpected sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial auth check
    refreshAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setUser(session.user);
            setSession(session);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
