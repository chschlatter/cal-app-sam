/**
 * Tests for validation and authorization
 */

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { config, getApiUrl } from './config';
import { login, createEvent, cleanupTestEvents, type AuthSession } from './helpers';

describe('Validation Tests', () => {
  let session: AuthSession;
  let createdEventIds: string[] = [];

  beforeEach(async () => {
    session = await login();
    await cleanupTestEvents(session);
  });

  afterEach(async () => {
    // Cleanup
    for (const id of createdEventIds) {
      try {
        await fetch(getApiUrl(`/events/${id}`), {
          method: 'DELETE',
          headers: { Cookie: session.cookie },
        });
      } catch (err) {
        // Ignore
      }
    }
    createdEventIds = [];
  });

  test('should prevent overlapping events', async () => {
    // Create first event (2 days minimum)
    const event1 = await createEvent(session, {
      title: config.testUser,
      start: '2099-05-10',
      end: '2099-05-12',
    });
    createdEventIds.push(event1.id);

    // Try to create overlapping event (2 days minimum)
    // Event 1 has slot for 2099-05-10 only (due to end - 1 day logic)
    // Event 2 needs to include 2099-05-10 to overlap
    const response = await fetch(getApiUrl('/events'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: session.cookie,
      },
      body: JSON.stringify({
        title: config.testUser,
        start: '2099-05-10', // Same start date - will conflict on 2099-05-10 slot
        end: '2099-05-12', // 2 days
      }),
    });

    assert.strictEqual(response.status, 409);

    const error = await response.json();
    assert.ok(error.message);
    assert.ok(error.cause); // Should contain overlapping event details
  });

  test('should prevent non-admin from creating events for other users', async () => {
    const response = await fetch(getApiUrl('/events'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: session.cookie,
      },
      body: JSON.stringify({
        title: config.otherUser, // Trying to create for Helmi
        start: '2099-06-10',
        end: '2099-06-12', // 2 days minimum
      }),
    });

    assert.strictEqual(response.status, 403);

    const error = await response.json();
    assert.ok(error.message);
  });

  test('should prevent non-admin from updating other users events', async () => {
    // Create event for test user (2 days minimum)
    const event = await createEvent(session, {
      title: config.testUser,
      start: '2099-07-10',
      end: '2099-07-12',
    });
    createdEventIds.push(event.id);

    // Try to change title to another user
    const response = await fetch(getApiUrl(`/events/${event.id}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: session.cookie,
      },
      body: JSON.stringify({
        id: event.id,
        title: config.otherUser, // Trying to change to Helmi
        start: '2099-07-10',
        end: '2099-07-12', // 2 days minimum
      }),
    });

    assert.strictEqual(response.status, 403);
  });

  test('should prevent non-admin from deleting other users events', async () => {
    // Login as different user to create their event
    const otherSession = await login(config.otherUser);
    const event = await createEvent(otherSession, {
      title: config.otherUser,
      start: '2099-08-10',
      end: '2099-08-12', // 2 days minimum
    });
    createdEventIds.push(event.id);

    // Try to delete with our test user session
    const response = await fetch(getApiUrl(`/events/${event.id}`), {
      method: 'DELETE',
      headers: { Cookie: session.cookie },
    });

    assert.strictEqual(response.status, 403);

    // Cleanup with correct session
    await fetch(getApiUrl(`/events/${event.id}`), {
      method: 'DELETE',
      headers: { Cookie: otherSession.cookie },
    });
  });

  test('should return 400 for missing required fields', async () => {
    const response = await fetch(getApiUrl('/events'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: session.cookie,
      },
      body: JSON.stringify({
        title: config.testUser,
        // Missing start and end
      }),
    });

    assert.strictEqual(response.status, 400);
  });

  test('should return 400 for event not found', async () => {
    const response = await fetch(getApiUrl('/events/nonexistent-id'), {
      method: 'DELETE',
      headers: { Cookie: session.cookie },
    });

    assert.strictEqual(response.status, 400);
  });
});
