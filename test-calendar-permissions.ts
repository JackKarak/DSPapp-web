// Quick Google Calendar Permission Test
// This will test if the service account has the right permissions

import { supabase } from './lib/supabase';

export const testCalendarPermissions = async () => {
  console.log('🔍 Testing Google Calendar Permissions...\n');
  
  try {
    // Step 1: Get access token
    console.log('1️⃣ Getting access token...');
    const { data, error } = await supabase.functions.invoke('google-calendar-auth');
    
    if (error) {
      console.error('❌ Failed to get access token:', error);
      return false;
    }
    
    console.log('✅ Access token received\n');
    
    // Step 2: Test calendar access
    console.log('2️⃣ Testing calendar access...');
    const CALENDAR_ID = '2fcabe745ddb6168899f921984a988938842026359b78e7588d129e64e84dde6@group.calendar.google.com';
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}`,
      {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
        },
      }
    );
    
    if (response.status === 403) {
      console.error('❌ PERMISSION DENIED');
      console.error('🚨 You need to add the service account to your calendar:');
      console.error('📧 Email: dsp-calendar-admin@focal-cooler-470420-d7.iam.gserviceaccount.com');
      console.error('🔐 Permission: "Make changes to events"');
      console.error('🔗 Go to: https://calendar.google.com/calendar/u/0/settings\n');
      return false;
    }
    
    if (!response.ok) {
      console.error('❌ Calendar access failed:', response.status, response.statusText);
      return false;
    }
    
    console.log('✅ Calendar access successful!');
    console.log('🎉 Your Google Calendar integration is ready to use!\n');
    return true;
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    return false;
  }
};

// Run the test
testCalendarPermissions();
