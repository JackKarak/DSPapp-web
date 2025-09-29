import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

// Get credentials from environment variables or Expo config
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://brjmujpjbmzhjepxamek.supabase.co'
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyam11anBqYm16aGplcHhhbWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MDA1NTIsImV4cCI6MjA2NTA3NjU1Mn0.u61irpORyVydGso_FweDqV5dEdGYQubcDxJlgann9gA'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration is missing. Please check your environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
})
