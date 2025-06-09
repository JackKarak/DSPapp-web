import { supabase } from '../../lib/supabase';

console.log('Supabase client:', supabase);

// app/(tabs)/index.tsx
import { Redirect } from 'expo-router';

export default function IndexRedirect() {
  return <Redirect href="/calendar" />;
}
