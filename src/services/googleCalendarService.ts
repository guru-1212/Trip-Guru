/**
 * Google Calendar API Service
 * 
 * Handles interaction with Google Calendar API v3.
 * Documentation: https://developers.google.com/calendar/api/v3/reference
 */

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const APP_CALENDAR_NAME = 'Trip-Guru Reminders';

export interface CalendarEventDetails {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string; // ISO 8601
    timeZone?: string;
  };
  end: {
    dateTime: string; // ISO 8601
    timeZone?: string;
  };
  recurrence?: string[]; // e.g. ["RRULE:FREQ=DAILY"]
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>;
  };
}

/**
 * Ensures a dedicated calendar for the app exists and returns its ID.
 */
export async function getOrCreateAppCalendar(accessToken: string): Promise<string> {
  try {
    const calendars = await listCalendars(accessToken);
    const existing = calendars.find(c => c.summary === APP_CALENDAR_NAME);
    
    if (existing) {
      return existing.id;
    }

    return await createCalendar(accessToken, APP_CALENDAR_NAME);
  } catch (err) {
    console.error('Error managing app calendar, falling back to primary:', err);
    return 'primary';
  }
}

/**
 * Lists all calendars in the user's account.
 */
async function listCalendars(accessToken: string): Promise<Array<{ id: string; summary: string }>> {
  const response = await fetch(`${CALENDAR_API_BASE}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to list calendars');
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Creates a new calendar.
 */
async function createCalendar(accessToken: string, summary: string): Promise<string> {
  const response = await fetch(`${CALENDAR_API_BASE}/calendars`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ summary }),
  });

  if (!response.ok) {
    throw new Error('Failed to create dedicated calendar');
  }

  const data = await response.json();
  return data.id;
}

/**
 * Lists events from a specific calendar.
 */
export async function listCalendarEvents(
  accessToken: string,
  calendarId: string = 'primary',
  maxResults: number = 250,
  includePast: boolean = true
): Promise<any[]> {
  let url = `${CALENDAR_API_BASE}/calendars/${calendarId}/events?maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;

  if (!includePast) {
    const now = new Date().toISOString();
    url += `&timeMin=${now}`;
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google Calendar API Error: ${error.error.message || response.statusText}`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Creates a new event in a specific calendar.
 */
export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEventDetails,
  calendarId: string = 'primary'
): Promise<string> {
  const response = await fetch(`${CALENDAR_API_BASE}/calendars/${calendarId}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google Calendar API Error: ${error.error.message || response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Updates an existing calendar event.
 */
export async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: Partial<CalendarEventDetails>
): Promise<void> {
  const response = await fetch(`${CALENDAR_API_BASE}/calendars/${calendarId}/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google Calendar API Error: ${error.error.message || response.statusText}`);
  }
}

/**
 * Deletes a calendar event.
 */
export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const response = await fetch(`${CALENDAR_API_BASE}/calendars/${calendarId}/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.json();
    throw new Error(`Google Calendar API Error: ${error.error.message || response.statusText}`);
  }
}

/**
 * Helper to generate an RRULE for daily reminders.
 */
export function generateDailyRRule(until?: string): string {
  return until ? `RRULE:FREQ=DAILY;UNTIL=${until.replace(/[-:]/g, '')}` : 'RRULE:FREQ=DAILY';
}

/**
 * Helper to generate an RRULE for yearly reminders (e.g. Birthdays).
 */
export function generateYearlyRRule(): string {
  return 'RRULE:FREQ=YEARLY';
}
