# API Tests

This directory contains API tests using Node.js built-in test runner.

## Structure

```
tests/
├── config.ts           # Test configuration (base URL, test users, etc.)
├── helpers.ts          # Shared helper functions (login, create event, etc.)
├── login.test.ts       # Tests for login handler
├── events.test.ts      # Tests for events CRUD operations
├── validation.test.ts  # Tests for validation and authorization
├── users.test.ts       # Tests for users handler
└── README.md          # This file
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/events.test.ts

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage (if configured)
npm test -- --experimental-test-coverage
```

## Configuration

Tests use the following configuration (see [config.ts](config.ts)):

- **Base URL**: `https://kalender-dev.schlatter.net` (override with `API_BASE_URL` env var)
- **Test User**: `Nils` (regular user)
- **Admin User**: `Christian` (admin with Google OAuth)
- **Test Date Range**: Year 2099 (to avoid conflicts with real events)

To test against local SAM:
```bash
API_BASE_URL=http://localhost:3000 npm test
```

## Test Strategy

### Independent Tests
Each test is fully independent:
- Creates its own test data
- Cleans up after itself (using `afterEach`)
- Can run in any order
- Can run individually

### Authentication
Tests use the `login()` helper to authenticate:
```typescript
const session = await login(); // Returns { cookie, user }
```

### Cleanup
- `beforeEach`: Cleans up leftover events from failed tests
- `afterEach`: Cleans up events created during the test
- All test events use dates in year 2099

### Test Data
Tests create events in the far future (2099) to avoid conflicts with real calendar data:
```typescript
{
  title: 'Nils',
  start: '2099-01-15',
  end: '2099-01-17'
}
```

## Helper Functions

See [helpers.ts](helpers.ts) for available helpers:

- `login(username?)` - Login and get auth session
- `createEvent(session, eventData)` - Create an event
- `deleteEvent(session, eventId)` - Delete an event
- `listEvents(session, start?, end?)` - List events in date range
- `cleanupTestEvents(session)` - Delete all events in test date range

## Writing New Tests

Example test structure:

```typescript
import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { login, createEvent, type AuthSession } from './helpers';

describe('My Feature', () => {
  let session: AuthSession;
  let createdIds: string[] = [];

  beforeEach(async () => {
    session = await login();
  });

  afterEach(async () => {
    // Cleanup
    for (const id of createdIds) {
      await deleteEvent(session, id);
    }
  });

  test('should do something', async () => {
    const event = await createEvent(session, { ... });
    createdIds.push(event.id);

    assert.strictEqual(event.title, 'Nils');
  });
});
```

## Advantages Over Bruno

- ✅ **Zero dependencies** - Uses Node.js built-in features
- ✅ **TypeScript native** - Full type safety
- ✅ **Clean code** - No axios, no complex cookie handling
- ✅ **Proper fixtures** - beforeEach/afterEach for setup/cleanup
- ✅ **Fast** - No external tools needed
- ✅ **CI/CD friendly** - Easy to integrate
- ✅ **Debuggable** - Standard Node.js debugging
