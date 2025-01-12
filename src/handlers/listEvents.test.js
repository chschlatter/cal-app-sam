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

describe("List events - GET /api/events", () => {
  let apiCall;
  let eventsSample;

  before(async () => {
    apiCall = await getApiCallFn();
    await clearDb(apiCall, 2025);
    eventsSample = getSample("listEvents", 2025);
    await populateDb(apiCall, eventsSample);
  });

  after(async () => {
    await clearDb(apiCall, 2025);
  });

  test("List all events", async () => {
    const startDate = new Date("2025-01-01").toISOString();
    const endDate = new Date("2025-12-31").toISOString();
    const queryParams = encodeURI(`?start=${startDate}&end=${endDate}`);

    const response = await apiCall("/api/events" + queryParams);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert(Array.isArray(body));
    assert(body.length == eventsSample.length);
  });

  test("List events for a specific period", async () => {
    const startDate = new Date("2025-03-04").toISOString();
    const endDate = new Date("2025-03-31").toISOString();
    const queryParams = encodeURI(`?start=${startDate}&end=${endDate}`);

    const response = await apiCall("/api/events" + queryParams);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert(Array.isArray(body));
    assert(body.length == 2);
  });

  test("Check returned data", async () => {
    const startDate = new Date("2025-02-01").toISOString();
    const endDate = new Date("2025-02-28").toISOString();
    const queryParams = encodeURI(`?start=${startDate}&end=${endDate}`);

    const response = await apiCall("/api/events" + queryParams);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert(Array.isArray(body));
    assert(body.length == 1);

    const expected = eventsSample.find((event) => event.start == "2025-02-26");
    assert.equal(body[0].title, expected.title);
    assert.equal(body[0].start, expected.start);
    assert.equal(body[0].end, expected.end);
    assert(body[0].id);
    assert(body[0].color);
  });

  test("Check for missing start date", async () => {
    const endDate = new Date("2025-03-13").toISOString();
    const queryParams = encodeURI(`?end=${endDate}`);

    const response = await apiCall("/api/events" + queryParams);
    assert.equal(response.status, 400);
  });
});
