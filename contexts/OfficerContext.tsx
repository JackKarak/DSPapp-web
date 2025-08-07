import React, { createContext, useContext, useEffect, useState } from 'react';
import { Officer, OfficerManager } from '../lib/officers/officerManager';
import { supabase } from '../lib/supabase';

interface OfficerContextType {
  currentOfficer: Officer | null;
  officers: Officer[];
  loading: boolean;
  refreshOfficers: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isOfficer: boolean;
  isAdmin: boolean;
}

const OfficerContext = createContext<OfficerContextType | undefined>(undefined);

export function OfficerProvider({ children }: { children: React.ReactNode }) {
  const [currentOfficer, setCurrentOfficer] = useState<Officer | null>(null);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshOfficers = async () => {
    try {
      const [officersData, currentUser] = await Promise.all([
        OfficerManager.getAllOfficers(),
        supabase.auth.getUser()
      ]);

      setOfficers(officersData);

      if (currentUser.data.user) {
        const currentOfficerData = await OfficerManager.getCurrentUserOfficerInfo(
          currentUser.data.user.id
        );
        setCurrentOfficer(currentOfficerData);
      }
    } catch (error) {
      console.error('Error fetching officers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshOfficers();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const officerData = await OfficerManager.getCurrentUserOfficerInfo(session.user.id);
        setCurrentOfficer(officerData);
      } else if (event === 'SIGNED_OUT') {
        setCurrentOfficer(null);
        setOfficers([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasPermission = (permission: string): boolean => {
    if (!currentOfficer) return false;
    return OfficerManager.hasPermission(currentOfficer, permission);
  };

  const isOfficer = currentOfficer?.role === 'officer' || currentOfficer?.role === 'admin';
  const isAdmin = currentOfficer?.role === 'admin';

  return (
    <OfficerContext.Provider value={{
      currentOfficer,
      officers,
      loading,
      refreshOfficers,
      hasPermission,
      isOfficer,
      isAdmin
    }}>
      {children}
    </OfficerContext.Provider>
  );
}

export const useOfficer = () => {
  const context = useContext(OfficerContext);
  if (context === undefined) {
    throw new Error('useOfficer must be used within an OfficerProvider');
  }
  return context;
};
