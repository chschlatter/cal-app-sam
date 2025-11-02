/**
 * Tests for /api2/users endpoint
 *
 * Note: The /users endpoint requires admin role, which requires Google Auth.
 *
 * To enable admin testing, implement Option 1 in login.ts:
 *
 * ```typescript
 * // In src/handlers/routes/login.ts, around line 32:
 * if (user.role === "admin") {
 *   if (!googleAuthJWT) {
 *     throw new HTTPException(406, {
 *       message: "Admin users must provide a Google Auth JWT",
 *     });
 *   }
 *
 *   // ADDITION: Skip Lambda verification in test mode
 *   if (process.env.TEST_MODE === 'true') {
 *     console.log('TEST_MODE: Skipping Google token verification');
 *   } else {
 *     // Invoke the verifyGoogleToken Lambda function
 *     // ... existing code ...
 *   }
 * }
 * ```
 *
 * Then in tests, login with:
 * ```typescript
 * const adminSession = await login(config.adminUser, 'fake-test-token');
 * ```
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';
import { getApiUrl } from './config';
import { login, type AuthSession } from './helpers';

describe('Users Handler', () => {
  let session: AuthSession;

  beforeEach(async () => {
    session = await login();
  });

  // TODO: This test requires admin access, which needs Google Auth JWT
  //
  // Options to enable automated testing of admin functionality:
  //
  // 1. **Mock Lambda verification (Recommended)**
  //    - Add TEST_MODE environment variable
  //    - In login.ts, check if TEST_MODE=true and skip Lambda invocation
  //    - Accept any googleAuthJWT in test mode
  //
  // 2. **Test-only admin user**
  //    - Add a user with role="admin" but a flag like "skipGoogleAuth": true in users.json
  //    - Only allow this in non-production environments
  //
  // 3. **Mock the Lambda function itself**
  //    - Use AWS SAM local testing with mocked Lambda responses
  //    - More complex setup but most realistic
  //
  // 4. **Environment-based token**
  //    - Store a long-lived test Google token in environment variable
  //    - Requires manual refresh when token expires
  //    - Not suitable for CI/CD
  test.skip('should list all users (requires admin)', async () => {
    const response = await fetch(getApiUrl('/users'), {
      headers: { Cookie: session.cookie },
    });

    assert.strictEqual(response.status, 200);

    const users = await response.json();
    assert.ok(Array.isArray(users));
    assert.ok(users.length > 0);

    // Check structure
    users.forEach((user: any) => {
      assert.ok(user.name);
      assert.ok(user.role);
      assert.ok(user.color);
    });
  });

  test('should return 403 for non-admin users', async () => {
    // Regular user session should get 403
    const response = await fetch(getApiUrl('/users'), {
      headers: { Cookie: session.cookie },
    });

    assert.strictEqual(response.status, 403);

    const error = await response.json();
    assert.ok(error.message);
  });

  test('should return 401 without authentication', async () => {
    const response = await fetch(getApiUrl('/users'));

    assert.strictEqual(response.status, 401);
  });
});
