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

describe("Update event - PUT /api/events/{id}", () => {
  let apiCall;
  let testUsername;
  let existingEvent;

  before(async () => {
    apiCall = await getApiCallFn();
    await clearDb(apiCall, 2027);
    testUsername = getEnv("TEST_USERNAME");
  });

  beforeEach(async () => {
    const event = {
      title: testUsername,
      start: "2027-04-01",
      end: "2027-04-03",
    };

    const response = await apiCall("/api/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
    assert.equal(response.status, 200);
    existingEvent = await response.json();
  });

  afterEach(async () => {
    await clearDb(apiCall, 2027);
  });

  after(async () => {
    await clearDb(apiCall, 2027);
  });

  test("Update an event", async () => {
    const updatedEvent = {
      id: existingEvent.id,
      title: testUsername,
      start: "2027-04-03",
      end: "2027-04-05",
    };

    const response = await apiCall(`/api/events/${existingEvent.id}`, {
      method: "PUT",
      body: JSON.stringify(updatedEvent),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.title, updatedEvent.title);
    assert.equal(body.start, updatedEvent.start);
    assert.equal(body.end, updatedEvent.end);
  });

  test("Update an event with missing title", async () => {
    const updatedEvent = {
      id: existingEvent.id,
      start: "2027-04-03",
      end: "2027-04-05",
    };

    const response = await apiCall(`/api/events/${existingEvent.id}`, {
      method: "PUT",
      body: JSON.stringify(updatedEvent),
    });
    assert.equal(response.status, 400);
  });

  test("Update an event with missing start date", async () => {
    const updatedEvent = {
      id: existingEvent.id,
      title: testUsername,
      end: "2027-04-04",
    };

    const response = await apiCall(`/api/events/${existingEvent.id}`, {
      method: "PUT",
      body: JSON.stringify(updatedEvent),
    });
    assert.equal(response.status, 400);
  });

  test("Update an event with missing end date", async () => {
    const updatedEvent = {
      id: existingEvent.id,
      title: testUsername,
      start: "2027-04-03",
    };

    const response = await apiCall(`/api/events/${existingEvent.id}`, {
      method: "PUT",
      body: JSON.stringify(updatedEvent),
    });
    assert.equal(response.status, 400);
  });

  test("Update an event with invalid date", async () => {
    const updatedEvent = {
      id: existingEvent.id,
      title: testUsername,
      start: "2027-04-03",
      end: "2027-04-32",
    };

    const response = await apiCall(`/api/events/${existingEvent.id}`, {
      method: "PUT",
      body: JSON.stringify(updatedEvent),
    });
    assert.equal(response.status, 400);
  });

  test("Update an event with invalid title", async () => {
    const updatedEvent = {
      id: existingEvent.id,
      title: "",
      start: "2027-04-03",
      end: "2027-04-05",
    };

    const response = await apiCall(`/api/events/${existingEvent.id}`, {
      method: "PUT",
      body: JSON.stringify(updatedEvent),
    });
    assert.equal(response.status, 400);
  });

  test("Update an event with non-existing id", async () => {
    const updatedEvent = {
      id: "non-existing-id",
      title: testUsername,
      start: "2027-04-03",
      end: "2027-04-05",
    };

    const response = await apiCall(`/api/events/non-existing-id`, {
      method: "PUT",
      body: JSON.stringify(updatedEvent),
    });
    assert.equal(response.status, 400);
  });

  test("Update an event with overlapping dates", async () => {
    const event = {
      title: testUsername,
      start: "2027-04-05",
      end: "2027-04-07",
    };

    const response = await apiCall("/api/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
    assert.equal(response.status, 200);
    const newEvent = await response.json();

    const updatedEvent = {
      id: existingEvent.id,
      title: testUsername,
      start: "2027-04-04",
      end: "2027-04-08",
    };

    const response2 = await apiCall(`/api/events/${existingEvent.id}`, {
      method: "PUT",
      body: JSON.stringify(updatedEvent),
    });
    assert.equal(response2.status, 409);
    /*
    const body = await response2.json();
    assert.equal(body.details.overlap_start, false);
    assert.equal(body.details.overlap_end, false);
    */
  });

  test("Update an event with overlapping start date", async () => {
    const event = {
      title: testUsername,
      start: "2027-04-05",
      end: "2027-04-07",
    };

    const response = await apiCall("/api/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
    assert.equal(response.status, 200);
    const newEvent = await response.json();

    const updatedEvent = {
      id: existingEvent.id,
      title: testUsername,
      start: "2027-04-05",
      end: "2027-04-08",
    };

    const response2 = await apiCall(`/api/events/${existingEvent.id}`, {
      method: "PUT",
      body: JSON.stringify(updatedEvent),
    });
    assert.equal(response2.status, 409);
    /*
    const body = await response2.json();
    assert.equal(body.details.overlap_start, true);
    assert.equal(body.details.overlap_end, false);
    */
  });

  test("Update an event with overlapping end date", async () => {
    const event = {
      title: testUsername,
      start: "2027-04-05",
      end: "2027-04-07",
    };

    const response = await apiCall("/api/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
    assert.equal(response.status, 200);
    const newEvent = await response.json();

    const updatedEvent = {
      id: existingEvent.id,
      title: testUsername,
      start: "2027-04-04",
      end: "2027-04-07",
    };

    const response2 = await apiCall(`/api/events/${existingEvent.id}`, {
      method: "PUT",
      body: JSON.stringify(updatedEvent),
    });
    assert.equal(response2.status, 409);
    /*
    const body = await response2.json();
    assert.equal(body.details.overlap_start, false);
    assert.equal(body.details.overlap_end, true);
    */
  });

  test("Update an event with max days", async () => {
    const updatedEvent = {
      id: existingEvent.id,
      title: testUsername,
      start: "2027-04-03",
      end: "2027-12-10",
    };

    const response = await apiCall(`/api/events/${existingEvent.id}`, {
      method: "PUT",
      body: JSON.stringify(updatedEvent),
    });
    assert.equal(response.status, 400);
  });

  /* TODO: Add test for updating an event with invalid date format */
  /*
  test("Update an event with invalid date format", async () => {
    const updatedEvent = {
      id: existingEvent.id,
      title: testUsername,
      start: "2027-04-03",
      end: "2027-04-04T00:00:00",
    };

    const response = await apiCall(`/api/events/${existingEvent.id}`, {
      method: "PUT",
      body: JSON.stringify(updatedEvent),
    });
    assert.equal(response.status, 400);
  });
  */

  test("Update an event with invalid JSON", async () => {
    const updatedEvent = {
      id: existingEvent.id,
      title: testUsername,
      start: "2027-04-03",
      end: "2027-04-05",
    };

    const response = await apiCall(`/api/events/${existingEvent.id}`, {
      method: "PUT",
      body: "invalid JSON",
    });
    assert.equal(response.status, 400);
  });

  test("Update an event with missing body", async () => {
    const response = await apiCall(`/api/events/${existingEvent.id}`, {
      method: "PUT",
    });
    assert.equal(response.status, 400);
  });

  test("Update an event with missing id in path", async () => {
    const updatedEvent = {
      title: testUsername,
      start: "2027-04-03",
      end: "2027-04-05",
    };

    const response = await apiCall(`/api/events`, {
      method: "PUT",
      body: JSON.stringify(updatedEvent),
    });
    assert.equal(response.status, 403);
  });
});
