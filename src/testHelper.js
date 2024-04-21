// @ts-check

require("dotenv").config();
const { getSecret, getEnv } = require("./secrets");
const jwt = require("jsonwebtoken");

/**
 * Get auth token
 * @param {string} apiBaseURL - API base URL
 * @param {string} username - username
 * @param {string} secret - secret
 * @returns {Promise<string>} - auth token
 */
const getAuthToken = async (apiBaseURL, username, secret) => {
  const token = jwt.sign({ username }, secret);
  const response = await fetch(apiBaseURL + "/api/test/auth?jwt=" + token);
  if (!response.ok) {
    throw new Error("Failed to get auth token");
  }
  const body = await response.json();
  return body.token;
};

/**
 * Get API call function (gets auth token)
 * @returns {Promise<(path: string, options?: RequestInit) => Promise<Response>>}
 */
const getApiCallFn = async () => {
  const apiBaseURL = getEnv("TEST_API_BASE_URL");
  const token = await getAuthToken(
    apiBaseURL,
    getEnv("TEST_USERNAME"),
    getSecret("TEST_JWT_SECRET")
  );
  return async (path, options) => {
    return await fetch(apiBaseURL + path, {
      ...options,
      headers: {
        ...(options?.headers || {}),
        Cookie: token,
      },
    });
  };
};

/**
 * Clear database
 * @param {(path: string, options?: RequestInit) => Promise<Response>} apiCallFn - API call function
 * @param {number} year - year
 * @returns {Promise<void>}
 */
const clearDb = async (apiCallFn, year) => {
  const response = await apiCallFn(`/api/test/events/${year}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to clear database");
  }
};

/**
 * Populate database
 * @param {(path: string, options?: RequestInit) => Promise<Response>} apiCallFn - API call function
 * @param {Array<import("./model/events2.model").Event>} events - events
 * @returns {Promise<void>}
 */
const populateDb = async (apiCallFn, events) => {
  const response = await apiCallFn("/api/test/events", {
    method: "POST",
    body: JSON.stringify(events),
  });
  if (!response.ok) {
    throw new Error("Failed to populate database");
  }
};

module.exports = {
  getApiCallFn,
  clearDb,
  populateDb,
};
