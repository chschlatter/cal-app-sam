// @ts-check

const { getApiCallFn, clearDb, populateDb } = require("../testHelper");
const {
  describe,
  test,
  before,
  beforeEach,
  afterEach,
  after,
} = require("node:test");
const assert = require("node:assert/strict");
const { getSample } = require("../testEventsSamples");
require("dotenv").config();
const { getEnv } = require("../secrets");

describe("Create event - POST /api/events", () => {
  let apiCall;
  let eventsSample;
  let testUsername;

  before(async () => {
    apiCall = await getApiCallFn();
    await clearDb(apiCall, 2026);
    eventsSample = getSample("listEvents", 2026);
    await populateDb(apiCall, eventsSample);
    testUsername = getEnv("TEST_USERNAME");
  });

  /*
  after(async () => {
    await clearDb(apiCall, 2026);
  });
  */

  test("Create an event", async () => {
    const event = {
      title: testUsername,
      start: "2026-04-01",
      end: "2026-04-02",
    };

    const response = await apiCall("/api/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.title, event.title);
    assert.equal(body.start, event.start);
    assert.equal(body.end, event.end);
  });

  test("Create an event with missing title", async () => {
    const event = {
      start: "2026-04-10",
      end: "2026-04-12",
    };

    const response = await apiCall("/api/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
    assert.equal(response.status, 400);
  });

  test("Create an event with missing start date", async () => {
    const event = {
      title: testUsername,
      end: "2026-04-12",
    };

    const response = await apiCall("/api/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
    assert.equal(response.status, 400);
  });

  test("Create an event with missing end date", async () => {
    const event = {
      title: testUsername,
      start: "2026-04-10",
    };

    const response = await apiCall("/api/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
    assert.equal(response.status, 400);
  });

  test("Create an event with invalid date", async () => {
    const event = {
      title: testUsername,
      start: "2026-04-10",
      end: "2026-04-32",
    };

    const response = await apiCall("/api/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
    assert.equal(response.status, 400);
  });

  test("Create an event with invalid title", async () => {
    const event = {
      title: "XXX",
      start: "2026-04-10",
      end: "2026-04-12",
    };

    const response = await apiCall("/api/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
    assert.equal(response.status, 400);
  });

  test("Create an event with invalid duration", async () => {
    const event = {
      title: testUsername,
      start: "2026-04-10",
      end: "2026-04-09",
    };

    const response = await apiCall("/api/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
    assert.equal(response.status, 400);
  });

  test("Create an event with too long duration", async () => {
    const event = {
      title: testUsername,
      start: "2026-04-10",
      end: "2026-12-20",
    };

    const response = await apiCall("/api/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
    assert.equal(response.status, 400);
  });

  test("Create an event with missing body", async () => {
    const response = await apiCall("/api/events", {
      method: "POST",
    });
    assert.equal(response.status, 400);
  });

  test("Create an event with invalid JSON", async () => {
    const response = await apiCall("/api/events", {
      method: "POST",
      body: "{",
    });
    assert.equal(response.status, 400);
  });

  test("Create an event that overlaps with an existing event (overlap_start)", async () => {
    const event = {
      title: testUsername,
      start: "2026-03-14",
      end: "2026-03-17",
    };

    const response = await apiCall("/api/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.ok(body.details.overlap_start);
    assert.ok(!body.details.overlap_end);
  });

  test("Create an event that overlaps with an existing event (overlap_end)", async () => {
    const event = {
      title: testUsername,
      start: "2026-02-25",
      end: "2026-03-01",
    };

    const response = await apiCall("/api/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.ok(!body.details.overlap_start);
    assert.ok(body.details.overlap_end);
  });

  test("Create an event that overlaps with an existing event (overlap_start && overlap_end)", async () => {
    const event = {
      title: testUsername,
      start: "2026-03-01",
      end: "2026-03-03",
    };

    const response = await apiCall("/api/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.ok(body.details.overlap_start);
    assert.ok(body.details.overlap_end);
  });
});
