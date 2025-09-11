import { supabase } from './lib/supabase';

// Test the Google Calendar authentication Edge Function
async function testCalendarAuth() {
  try {
    console.log('🧪 Testing Google Calendar authentication...');
    
    const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
      body: {}
    });

    if (error) {
      console.error('❌ Supabase function error:', error);
      return;
    }

    if (data.error) {
      console.error('❌ Edge Function error:', data);
      return;
    }

    console.log('✅ Authentication successful!');
    console.log('Access Token (first 20 chars):', data.access_token?.substring(0, 20) + '...');
    console.log('Token Type:', data.token_type);
    console.log('Expires In:', data.expires_in, 'seconds');
    
    return data.access_token;
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Test creating a calendar event
async function testCreateEvent(accessToken: string) {
  try {
    console.log('🗓️ Testing event creation...');
    
    const event = {
      summary: 'Test DSP Event',
      description: 'Test event created by DSP App',
      start: {
        dateTime: '2025-02-01T19:00:00-05:00',
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: '2025-02-01T21:00:00-05:00',
        timeZone: 'America/New_York'
      }
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Event creation failed:', response.status, error);
      return;
    }

    const createdEvent = await response.json();
    console.log('✅ Event created successfully!');
    console.log('Event ID:', createdEvent.id);
    console.log('Event Link:', createdEvent.htmlLink);
    
  } catch (error) {
    console.error('💥 Event creation failed:', error);
  }
}

// Run the tests
async function runTests() {
  const accessToken = await testCalendarAuth();
  
  if (accessToken) {
    await testCreateEvent(accessToken);
  }
}

// Export for manual testing
export { runTests, testCalendarAuth, testCreateEvent };

// Auto-run if this file is executed directly
if (require.main === module) {
  runTests();
}
