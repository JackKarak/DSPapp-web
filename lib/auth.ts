// lib/auth.ts
import { supabase } from './supabase';

export const getCurrentUser = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error fetching session:', error.message);
    return null;
  }
  return session?.user ?? null;
};
