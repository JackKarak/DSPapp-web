// Test Google Calendar Integration
// Run this test to verify your setup is working

import { supabase } from '../lib/supabase';

const CALENDAR_ID = '2fcabe745ddb6168899f921984a988938842026359b78e7588d129e64e84dde6@group.calendar.google.com';

async function testGoogleCalendarIntegration() {
  console.log('🧪 Testing Google Calendar Integration...\n');
  
  try {
    // Step 1: Test Edge Function Authentication
    console.log('1️⃣ Testing Edge Function Authentication...');
    const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
      body: {}
    });

    if (error) {
      console.error('❌ Edge Function Error:', error);
      return;
    }

    if (!data?.access_token) {
      console.error('❌ No access token received:', data);
      return;
    }

    console.log('✅ Access token received successfully');
    console.log(`   Token length: ${data.access_token.length} characters`);
    console.log(`   Expires in: ${data.expires_in} seconds\n`);

    // Step 2: Test Calendar Access
    console.log('2️⃣ Testing Calendar Access...');
    
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error('❌ Calendar access failed:', {
        status: calendarResponse.status,
        statusText: calendarResponse.statusText,
        body: errorText
      });
      
      if (calendarResponse.status === 403) {
        console.error('\n🚨 PERMISSION ERROR:');
        console.error('The service account needs to be added to your calendar!');
        console.error('Add this email to your calendar with "Make changes to events" permission:');
        console.error('📧 dsp-calendar-admin@focal-cooler-470420-d7.iam.gserviceaccount.com\n');
      }
      return;
    }

    const calendarInfo = await calendarResponse.json();
    console.log('✅ Calendar access successful');
    console.log(`   Calendar name: ${calendarInfo.summary}`);
    console.log(`   Calendar description: ${calendarInfo.description || 'No description'}\n`);

    // Step 3: Create Test Event
    console.log('3️⃣ Creating test event...');
    
    const testEvent = {
      summary: 'DSP Test Event - Delete Me',
      description: 'This is a test event created by the DSP app. Safe to delete.',
      location: 'Test Location',
      start: {
        dateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
        timeZone: 'America/New_York',
      },
      visibility: 'public',
    };

    const eventResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testEvent),
      }
    );

    if (!eventResponse.ok) {
      const errorText = await eventResponse.text();
      console.error('❌ Event creation failed:', {
        status: eventResponse.status,
        statusText: eventResponse.statusText,
        body: errorText
      });
      return;
    }

    const createdEvent = await eventResponse.json();
    console.log('✅ Test event created successfully');
    console.log(`   Event ID: ${createdEvent.id}`);
    console.log(`   Event link: ${createdEvent.htmlLink}\n`);

    // Step 4: Clean up test event
    console.log('4️⃣ Cleaning up test event...');
    
    const deleteResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${createdEvent.id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
        },
      }
    );

    if (deleteResponse.ok) {
      console.log('✅ Test event deleted successfully\n');
    } else {
      console.log('⚠️ Failed to delete test event (you can manually delete it)\n');
    }

    // Final Result
    console.log('🎉 INTEGRATION TEST SUCCESSFUL!');
    console.log('Your Google Calendar integration is working correctly.');
    console.log('You can now approve events in your DSP app and they will automatically appear in your Google Calendar.\n');

  } catch (error) {
    console.error('💥 Test failed with error:', error);
    console.error('\nPlease check:');
    console.error('1. Edge Function is deployed');
    console.error('2. Service account is added to calendar');
    console.error('3. All secrets are properly set');
  }
}

// Export for use in your app
export default testGoogleCalendarIntegration;

// Uncomment the line below to run the test immediately
// testGoogleCalendarIntegration();
