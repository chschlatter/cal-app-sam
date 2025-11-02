/**
 * Test helper functions
 */

import { config, getApiUrl } from './config';

export interface AuthSession {
  cookie: string;
  user: string;
}

/**
 * Login and get authentication cookie
 */
export async function login(username: string = config.testUser): Promise<AuthSession> {
  const response = await fetch(getApiUrl('/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: username,
      stayLoggedIn: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${await response.text()}`);
  }

  const cookie = response.headers.get('set-cookie');
  if (!cookie) {
    throw new Error('No cookie received from login');
  }

  return {
    cookie: cookie.split(';')[0], // Extract just the cookie value
    user: username,
  };
}

/**
 * Create an event
 */
export async function createEvent(
  session: AuthSession,
  eventData: { title: string; start: string; end: string }
) {
  const response = await fetch(getApiUrl('/events'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: session.cookie,
    },
    body: JSON.stringify(eventData),
  });

  if (!response.ok) {
    throw new Error(`Create event failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

/**
 * Delete an event
 */
export async function deleteEvent(session: AuthSession, eventId: string) {
  const response = await fetch(getApiUrl(`/events/${eventId}`), {
    method: 'DELETE',
    headers: { Cookie: session.cookie },
  });

  if (!response.ok) {
    throw new Error(`Delete event failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

/**
 * List events in a date range
 */
export async function listEvents(
  session: AuthSession,
  start: string = config.testDateStart,
  end: string = config.testDateEnd
) {
  const response = await fetch(
    getApiUrl(`/events?start=${start}&end=${end}`),
    {
      headers: { Cookie: session.cookie },
    }
  );

  if (!response.ok) {
    throw new Error(`List events failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

/**
 * Cleanup all events in the test date range
 */
export async function cleanupTestEvents(session: AuthSession) {
  const events = await listEvents(session);

  for (const event of events) {
    try {
      await deleteEvent(session, event.id);
    } catch (err) {
      // Silently ignore common cleanup errors:
      // - 400: Event already deleted by test
      // - 403: Authorization error (event belongs to another user)
      // - 409: Version conflict (event was modified/deleted)
      // - 500: Internal server error (transient)
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (!errorMsg.includes('400') && !errorMsg.includes('403') &&
          !errorMsg.includes('409') && !errorMsg.includes('500')) {
        console.error(`Failed to cleanup event ${event.id}:`, err);
      }
    }
  }

  return events.length;
}
