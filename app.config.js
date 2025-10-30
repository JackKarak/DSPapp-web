const baseConfig = require('./app.json');

module.exports = {
  ...baseConfig,
  expo: {
    ...baseConfig.expo,
    plugins: [
      ...(baseConfig.expo.plugins || []),
      "expo-web-browser"
    ],
    extra: {
      ...baseConfig.expo.extra,
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      environment: process.env.NODE_ENV || 'development',
      googleCalendarId: process.env.GOOGLE_CALENDAR_ID,
      eas: {
        projectId: "9f6f58a7-3407-4218-8b49-61530c10345f"
      },
    },
  },
};
