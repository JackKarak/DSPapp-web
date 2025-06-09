import { createClient } from '@supabase/supabase-js'

// Replace with your actual values from Supabase
const supabaseUrl = 'https://brjmujpjbmzhjepxamek.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyam11anBqYm16aGplcHhhbWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MDA1NTIsImV4cCI6MjA2NTA3NjU1Mn0.u61irpORyVydGso_FweDqV5dEdGYQubcDxJlgann9gA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
