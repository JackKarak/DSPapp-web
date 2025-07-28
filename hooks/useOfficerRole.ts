import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type OfficerRole = {
  is_officer: boolean;
  position: string | null;
};

export function useOfficerRole() {
  const [role, setRole] = useState<OfficerRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchOfficerRole() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw new Error('User not authenticated');
        }

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
            is_officer: data.officer_position !== null,
            position: data.officer_position
          });
        }
      } catch (error) {
        console.error('Error fetching officer role:', error);
        if (isMounted) {
          setRole({ is_officer: false, position: null });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchOfficerRole();

    return () => {
      isMounted = false;
    };
  }, []);

  return { role, loading };
}
