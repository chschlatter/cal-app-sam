/**
 * Tests for /api2/login endpoint
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { config, getApiUrl } from './config';

describe('Login Handler', () => {
  test('should login successfully with valid user', async () => {
    const response = await fetch(getApiUrl('/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: config.testUser,
        stayLoggedIn: false,
      }),
    });

    assert.strictEqual(response.status, 200);

    const data = await response.json();
    assert.strictEqual(data.name, config.testUser);
    assert.ok(data.role);
    assert.ok(data.color);

    // Check cookie is set
    const cookie = response.headers.get('set-cookie');
    assert.ok(cookie);
    assert.ok(cookie.includes('access_token'));
  });

  test('should return 400 for non-existent user', async () => {
    const response = await fetch(getApiUrl('/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'nonexistentuser',
        stayLoggedIn: false,
      }),
    });

    assert.strictEqual(response.status, 400);

    const data = await response.json();
    // The message is in German: "Benutzer nicht gefunden."
    assert.strictEqual(data.message, 'Benutzer nicht gefunden.');
    assert.strictEqual(data.cause, 'USER_NOT_FOUND');
  });

  test('should return 406 for admin without Google Auth JWT', async () => {
    const response = await fetch(getApiUrl('/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: config.adminUser, // Christian (admin)
        stayLoggedIn: false,
        // Missing googleAuthJWT
      }),
    });

    assert.strictEqual(response.status, 406);

    const data = await response.json();
    assert.ok(data.message.includes('Google Auth JWT'));
  });

  test('should set longer expiry with stayLoggedIn=true', async () => {
    const response = await fetch(getApiUrl('/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: config.testUser,
        stayLoggedIn: true,
      }),
    });

    assert.strictEqual(response.status, 200);

    const cookie = response.headers.get('set-cookie');
    assert.ok(cookie);
    // Cookie should have a Max-Age set
    assert.ok(cookie.includes('Max-Age'));
  });
});
