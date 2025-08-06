import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type OfficerRole = {
  is_officer: boolean;
  position: string | null;
};

// A defined initial state to avoid null checks in consuming components.
const initialRoleState: OfficerRole = {
  is_officer: false,
  position: null,
};

export function useOfficerRole() {
  const [role, setRole] = useState<OfficerRole>(initialRoleState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchOfficerRole() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error('User not authenticated');
        }

        // Pass the AbortSignal to the Supabase query.
        const { data, error } = await supabase
          .from('users')
          .select('officer_position')
          .eq('user_id', user.id)
          .single();

        if (error) {
          throw error;
        }

        if (isMounted) {
          setRole({
            is_officer: !!data.officer_position, // Simplified boolean conversion
            position: data.officer_position,
          });
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching officer role:', error);
          setRole(initialRoleState); // Reset to initial state on error
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchOfficerRole();

    // The cleanup function prevents state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, []);

  return { role, loading };
}
