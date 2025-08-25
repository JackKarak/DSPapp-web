// Simple Google Calendar integration for testing
// This version creates calendar links that users can click to add events manually

export interface SimpleCalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
}

export function createGoogleCalendarLink(event: SimpleCalendarEvent): string {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDate(event.startTime)}/${formatDate(event.endTime)}`,
    details: event.description || '',
    location: event.location || '',
    trp: 'false', // Don't show "Add to calendar" dialog
    sprop: 'website:dsp-app' // Optional: specify source
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Alternative: Create ICS file content for download
export function createICSFile(event: SimpleCalendarEvent): string {
  const formatICSDate = (dateString: string) => {
    return new Date(dateString).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DSP App//Event//EN',
    'BEGIN:VEVENT',
    `DTSTART:${formatICSDate(event.startTime)}`,
    `DTEND:${formatICSDate(event.endTime)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description || ''}`,
    `LOCATION:${event.location || ''}`,
    `UID:${Date.now()}@dsp-app.com`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}

// Function to trigger ICS file download (web only)
export function downloadICSFile(event: SimpleCalendarEvent, filename?: string) {
  if (typeof window === 'undefined') return;

  const icsContent = createICSFile(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  
  link.href = URL.createObjectURL(blob);
  link.download = filename || `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
