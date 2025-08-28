// Test file to verify Google Calendar integration is working
// Run this to test the Edge Function

const testGoogleCalendarAuth = async () => {
  try {
    // This would be your actual Supabase URL and anon key
    const SUPABASE_URL = 'https://brjmujpjbmzhjepxamek.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyam11anBqYm16aGplcHhhbWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MDA1NTIsImV4cCI6MjA2NTA3NjU1Mn0.u61irpORyVydGso_FweDqV5dEdGYQubcDxJlgann9gA'; // Updated with correct key
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-auth`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Google Calendar access token received:', data.access_token);
    return data.access_token;
    
  } catch (error) {
    console.error('Error testing Google Calendar auth:', error);
  }
};

// Export for use in your app
export default testGoogleCalendarAuth;
