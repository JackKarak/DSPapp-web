module.exports = {
  expo: {
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      environment: process.env.NODE_ENV || 'development',
      googleCalendarId: process.env.GOOGLE_CALENDAR_ID,
    }
  }
}
