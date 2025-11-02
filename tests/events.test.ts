/**
 * Tests for /api2/events endpoint
 */

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { config, getApiUrl } from './config';
import { login, createEvent, deleteEvent, listEvents, cleanupTestEvents, type AuthSession } from './helpers';

describe('Events Handler', () => {
  let session: AuthSession;
  let createdEventIds: string[] = [];

  beforeEach(async () => {
    session = await login();
    // Clean up any leftover test events
    await cleanupTestEvents(session);
  });

  afterEach(async () => {
    // Cleanup created events
    for (const id of createdEventIds) {
      try {
        await deleteEvent(session, id);
      } catch (err) {
        // Event might already be deleted
      }
    }
    createdEventIds = [];
  });

  test('should create an event', async () => {
    const eventData = {
      title: config.testUser,
      start: '2099-01-15',
      end: '2099-01-17',
    };

    const response = await fetch(getApiUrl('/events'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: session.cookie,
      },
      body: JSON.stringify(eventData),
    });

    assert.strictEqual(response.status, 201);

    const event = await response.json();
    assert.ok(event.id);
    assert.strictEqual(event.title, eventData.title);
    assert.strictEqual(event.start, eventData.start);
    assert.strictEqual(event.end, eventData.end);
    assert.ok(event.color);

    createdEventIds.push(event.id);
  });

  test('should list events in date range', async () => {
    // Create a test event
    const event = await createEvent(session, {
      title: config.testUser,
      start: '2099-02-10',
      end: '2099-02-12',
    });
    createdEventIds.push(event.id);

    // List events
    const events = await listEvents(session);

    assert.ok(Array.isArray(events));
    assert.ok(events.length > 0);

    // Find our event
    const foundEvent = events.find((e: any) => e.id === event.id);
    assert.ok(foundEvent);
    assert.strictEqual(foundEvent.title, config.testUser);
  });

  test('should update an event', async () => {
    // Create event (minimum 2 days)
    const event = await createEvent(session, {
      title: config.testUser,
      start: '2099-03-10',
      end: '2099-03-12', // 2 days
    });
    createdEventIds.push(event.id);

    // Update event
    const response = await fetch(getApiUrl(`/events/${event.id}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: session.cookie,
      },
      body: JSON.stringify({
        id: event.id,
        title: config.testUser,
        start: '2099-03-10',
        end: '2099-03-14', // Extended to 4 days
      }),
    });

    assert.strictEqual(response.status, 200);

    const updated = await response.json();
    assert.strictEqual(updated.id, event.id);
    assert.strictEqual(updated.end, '2099-03-14');
  });

  test('should delete an event', async () => {
    // Create event (minimum 2 days)
    const event = await createEvent(session, {
      title: config.testUser,
      start: '2099-04-10',
      end: '2099-04-12', // 2 days
    });

    // Delete event
    const response = await fetch(getApiUrl(`/events/${event.id}`), {
      method: 'DELETE',
      headers: { Cookie: session.cookie },
    });

    assert.strictEqual(response.status, 200);

    const result = await response.json();
    assert.strictEqual(result.message, 'Event deleted');

    // Verify it's gone
    const events = await listEvents(session);
    const found = events.find((e: any) => e.id === event.id);
    assert.strictEqual(found, undefined);
  });

  test('should return 401 without authentication', async () => {
    const response = await fetch(getApiUrl('/events?start=2099-01-01&end=2099-12-31'));

    assert.strictEqual(response.status, 401);
  });

  test('should reject event with 1-day duration (minimum is 2 days)', async () => {
    const eventData = {
      title: config.testUser,
      start: '2099-05-10',
      end: '2099-05-11', // Only 1 day
    };

    const response = await fetch(getApiUrl('/events'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: session.cookie,
      },
      body: JSON.stringify(eventData),
    });

    assert.strictEqual(response.status, 400);

    const error = await response.json();
    assert.ok(error.message.includes('Minimum') || error.message.includes('minimum'));
    assert.strictEqual(error.cause?.minDays, 2);
  });

  test('should accept exact 2-day minimum duration', async () => {
    const eventData = {
      title: config.testUser,
      start: '2099-05-15',
      end: '2099-05-17', // Exactly 2 days
    };

    const response = await fetch(getApiUrl('/events'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: session.cookie,
      },
      body: JSON.stringify(eventData),
    });

    assert.strictEqual(response.status, 201);

    const event = await response.json();
    assert.ok(event.id);
    assert.strictEqual(event.start, eventData.start);
    assert.strictEqual(event.end, eventData.end);

    createdEventIds.push(event.id);
  });

  test('should accept maximum 90-day duration', async () => {
    const eventData = {
      title: config.testUser,
      start: '2099-06-01',
      end: '2099-08-30', // Exactly 90 days
    };

    const response = await fetch(getApiUrl('/events'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: session.cookie,
      },
      body: JSON.stringify(eventData),
    });

    assert.strictEqual(response.status, 201);

    const event = await response.json();
    assert.ok(event.id);
    assert.strictEqual(event.title, eventData.title);
    assert.strictEqual(event.start, eventData.start);
    assert.strictEqual(event.end, eventData.end);

    createdEventIds.push(event.id);
  });

  test('should reject event exceeding 90-day maximum', async () => {
    const eventData = {
      title: config.testUser,
      start: '2099-07-01',
      end: '2099-10-01', // 92 days
    };

    const response = await fetch(getApiUrl('/events'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: session.cookie,
      },
      body: JSON.stringify(eventData),
    });

    assert.strictEqual(response.status, 400);

    const error = await response.json();
    assert.ok(error.message.includes('maximum') || error.message.includes('Maximum'));
    assert.strictEqual(error.cause?.maxDays, 90);
  });
});
