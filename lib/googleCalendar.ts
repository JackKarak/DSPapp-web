import { Platform } from 'react-native';
import { supabase } from './supabase';

// Google Calendar API configuration
const GOOGLE_CALENDAR_CONFIG = {
  CALENDAR_ID: '2fcabe745ddb6168899f921984a988938842026359b78e7588d129e64e84dde6@group.calendar.google.com', // DSP Calendar ID
  DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
  SCOPES: 'https://www.googleapis.com/auth/calendar'
};

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
  isAllDay?: boolean;
}

class GoogleCalendarService {
  private isInitialized = false;
  private gapi: any = null;
  private serviceAccount: any = null;

  // Get service account credentials from Supabase secrets
  private async getServiceAccount() {
    if (this.serviceAccount) {
      return this.serviceAccount;
    }

    try {
      // Note: In production, you would typically call a Supabase Edge Function
      // that securely handles the service account credentials
      // For now, we'll show the pattern for accessing secrets
      
      // This would be handled in a secure Edge Function:
      // const { data, error } = await supabase.rpc('get_google_service_account');
      
      // For demonstration, we'll return null and recommend using Edge Functions      return null;
    } catch (error) {
      console.error('Failed to get service account:', error);
      return null;
    }
  }

  // Get access token using our secure Edge Function
  private async getAccessToken(): Promise<string | null> {
    try {      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: {}
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        return null;
      }

      if (data.error) {
        console.error('❌ Edge Function error:', data);
        return null;
      }      return data.access_token;
      
    } catch (error) {
      console.error('💥 Failed to get access token:', error);
      return null;
    }
  }

  async initialize() {
    if (Platform.OS === 'web') {
      // For web, we would need to implement OAuth2 flow
      // This is not recommended for mobile apps due to security concerns      this.isInitialized = false;
      return Promise.resolve(false);
    } else {
      // For mobile, we'll use HTTP requests with service account via Edge Functions
      this.isInitialized = true;
      return Promise.resolve(true);
    }
  }

  async authenticate(): Promise<boolean> {
    if (Platform.OS === 'web' && this.gapi) {
      const authInstance = this.gapi.auth2.getAuthInstance();
      if (!authInstance.isSignedIn.get()) {
        try {
          await authInstance.signIn();
          return true;
        } catch (error) {
          console.error('Authentication failed:', error);
          return false;
        }
      }
      return true;
    }
    return true; // For mobile, assume authentication is handled elsewhere
  }

  async createCalendarEvent(event: CalendarEvent): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Format the event for Google Calendar API
      const calendarEvent = {
        summary: event.title,
        description: event.description || '',
        location: event.location || '',
        start: event.isAllDay 
          ? { date: event.startTime.split('T')[0] }
          : { dateTime: event.startTime, timeZone: 'America/New_York' }, // Adjust timezone as needed
        end: event.isAllDay 
          ? { date: event.endTime.split('T')[0] }
          : { dateTime: event.endTime, timeZone: 'America/New_York' },
        visibility: 'public',
        status: 'confirmed'
      };

      if (Platform.OS === 'web' && this.gapi) {
        // Web implementation using gapi
        const isAuthenticated = await this.authenticate();
        if (!isAuthenticated) {
          throw new Error('Authentication required');
        }

        const response = await this.gapi.client.calendar.events.insert({
          calendarId: GOOGLE_CALENDAR_CONFIG.CALENDAR_ID,
          resource: calendarEvent
        });

        return {
          success: true,
          eventId: response.result.id
        };
      } else {
        // Mobile implementation using direct HTTP requests
        // You'll need a service account or OAuth token for this
        return await this.createEventViaHTTP(calendarEvent);
      }
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async createEventViaHTTP(calendarEvent: any): Promise<{ success: boolean; eventId?: string; error?: string }> {
    // Use service account authentication via Supabase Edge Function
    try {
      const accessToken = await this.getAccessToken();
      
      if (!accessToken) {
        throw new Error('Failed to get access token');
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${GOOGLE_CALENDAR_CONFIG.CALENDAR_ID}/events`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(calendarEvent)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      return {
        success: true,
        eventId: result.id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'HTTP request failed'
      };
    }
  }

  async updateCalendarEvent(eventId: string, event: CalendarEvent): Promise<{ success: boolean; error?: string }> {
    try {
      const calendarEvent = {
        summary: event.title,
        description: event.description || '',
        location: event.location || '',
        start: event.isAllDay 
          ? { date: event.startTime.split('T')[0] }
          : { dateTime: event.startTime, timeZone: 'America/New_York' },
        end: event.isAllDay 
          ? { date: event.endTime.split('T')[0] }
          : { dateTime: event.endTime, timeZone: 'America/New_York' },
      };

      if (Platform.OS === 'web' && this.gapi) {
        const isAuthenticated = await this.authenticate();
        if (!isAuthenticated) {
          throw new Error('Authentication required');
        }

        await this.gapi.client.calendar.events.update({
          calendarId: GOOGLE_CALENDAR_CONFIG.CALENDAR_ID,
          eventId: eventId,
          resource: calendarEvent
        });

        return { success: true };
      } else {
        // Mobile HTTP implementation would go here
        return { success: false, error: 'Mobile update not implemented' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteCalendarEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (Platform.OS === 'web' && this.gapi) {
        const isAuthenticated = await this.authenticate();
        if (!isAuthenticated) {
          throw new Error('Authentication required');
        }

        await this.gapi.client.calendar.events.delete({
          calendarId: GOOGLE_CALENDAR_CONFIG.CALENDAR_ID,
          eventId: eventId
        });

        return { success: true };
      } else {
        // Mobile HTTP implementation would go here
        return { success: false, error: 'Mobile delete not implemented' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
