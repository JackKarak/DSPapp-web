import { Platform } from 'react-native';

// Google Calendar API configuration
const GOOGLE_CALENDAR_CONFIG = {
  // You'll need to get these from Google Cloud Console
  CLIENT_ID: 'your-client-id-here.googleusercontent.com',
  API_KEY: 'your-api-key-here',
  CALENDAR_ID: 'your-public-calendar-id@group.calendar.google.com', // or 'primary' for personal
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

  async initialize() {
    if (Platform.OS === 'web') {
      // For web, we can use the Google API directly
      return new Promise((resolve, reject) => {
        if (typeof window !== 'undefined' && (window as any).gapi) {
          this.gapi = (window as any).gapi;
          this.gapi.load('client:auth2', async () => {
            try {
              await this.gapi.client.init({
                apiKey: GOOGLE_CALENDAR_CONFIG.API_KEY,
                clientId: GOOGLE_CALENDAR_CONFIG.CLIENT_ID,
                discoveryDocs: [GOOGLE_CALENDAR_CONFIG.DISCOVERY_DOC],
                scope: GOOGLE_CALENDAR_CONFIG.SCOPES
              });
              this.isInitialized = true;
              resolve(true);
            } catch (error) {
              reject(error);
            }
          });
        } else {
          reject(new Error('Google API not available'));
        }
      });
    } else {
      // For mobile, we'll use HTTP requests directly
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
    // This requires a service account key or OAuth access token
    // For production, you'd typically handle this through your backend
    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${GOOGLE_CALENDAR_CONFIG.CALENDAR_ID}/events?key=${GOOGLE_CALENDAR_CONFIG.API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${accessToken}`, // You'll need an access token
          },
          body: JSON.stringify(calendarEvent)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
