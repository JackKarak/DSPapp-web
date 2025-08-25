# Google Calendar Integration Setup Guide

This guide will help you set up Google Calendar integration for your DSP app so that approved events are automatically added to your public Google Calendar.

## Prerequisites

1. A Google Account with access to Google Cloud Console
2. A public Google Calendar where events should be added

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click on it and press "Enable"

## Step 2: Create Credentials

### For Web App (if using Expo Web):
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Select "Web application"
4. Add your domain to "Authorized JavaScript origins" (e.g., `http://localhost:3000` for development)
5. Add redirect URI if needed
6. Copy the Client ID

### For Mobile App:
1. Create a Service Account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the details and click "Create"
   - Grant it the "Editor" role (or a custom role with Calendar permissions)
   - Create a JSON key and download it securely

## Step 3: Create/Setup Your Public Calendar

1. Go to [Google Calendar](https://calendar.google.com)
2. Create a new calendar or use an existing one:
   - Click the "+" next to "Other calendars"
   - Select "Create new calendar"
   - Name it (e.g., "DSP Events")
   - Make it public by going to Settings > Access permissions > "Make available to public"
3. Copy the Calendar ID:
   - Go to Calendar Settings
   - Scroll down to "Integrate calendar"
   - Copy the Calendar ID (looks like: `abcd1234@group.calendar.google.com`)

## Step 4: Configure the App

1. Open `lib/googleCalendar.ts`
2. Update the configuration:

```typescript
const GOOGLE_CALENDAR_CONFIG = {
  CLIENT_ID: 'your-actual-client-id.googleusercontent.com', // From Step 2
  API_KEY: 'your-actual-api-key', // From Google Cloud Console > Credentials
  CALENDAR_ID: 'your-calendar-id@group.calendar.google.com', // From Step 3
  DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
  SCOPES: 'https://www.googleapis.com/auth/calendar'
};
```

## Step 5: Add Required Dependencies

For web support, you need to include the Google API script. Add this to your web index.html:

```html
<script src="https://apis.google.com/js/api.js"></script>
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

## Step 6: Database Schema Update

Add a column to store the Google Calendar event ID for future reference:

```sql
ALTER TABLE events ADD COLUMN google_calendar_id VARCHAR(255);
```

## Step 7: For Production (Mobile Apps)

For mobile apps, you'll need to implement proper OAuth flow or use a backend service:

### Option A: Backend Service (Recommended)
Create an API endpoint on your backend that handles Google Calendar operations using a service account.

### Option B: OAuth Flow
Implement Google OAuth in your React Native app using libraries like:
- `@react-native-google-signin/google-signin`
- `expo-auth-session` (for Expo)

## Environment Variables (Recommended)

Instead of hardcoding credentials, use environment variables:

```typescript
const GOOGLE_CALENDAR_CONFIG = {
  CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  API_KEY: process.env.EXPO_PUBLIC_GOOGLE_API_KEY,
  CALENDAR_ID: process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_ID,
  // ... rest of config
};
```

Add to your `.env` file:
```
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
EXPO_PUBLIC_GOOGLE_API_KEY=your-api-key
EXPO_PUBLIC_GOOGLE_CALENDAR_ID=your-calendar-id
```

## Testing

1. Create a test event in your app
2. Approve it using the president confirmation screen
3. Check if it appears in your Google Calendar
4. Verify the event details are correct

## Troubleshooting

### Common Issues:

1. **"Authentication required" error**
   - Make sure OAuth is properly configured
   - Check that the user has signed in to Google

2. **"Calendar not found" error**
   - Verify the Calendar ID is correct
   - Ensure the calendar is public or the service account has access

3. **"Insufficient permissions" error**
   - Check that the Calendar API is enabled
   - Verify the OAuth scopes include calendar access

4. **CORS errors (Web)**
   - Add your domain to authorized origins in Google Cloud Console
   - Ensure you're using HTTPS in production

## Security Notes

- Never expose service account keys in client-side code
- Use environment variables for sensitive data
- Consider implementing a backend service for mobile apps
- Regularly rotate API keys and credentials

## Alternative: Manual Calendar Management

If automatic integration is too complex for your current setup, you can:
1. Export approved events to ICS format
2. Provide a "Add to Calendar" link for each approved event
3. Use a webhook to notify administrators when events are approved
