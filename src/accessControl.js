// @ts-check

/**
 * @typedef {Object.<string, {role: string, password?: string, color: string}>} Users
 */

/**
 * @type {Users}
 */
const users = require("../users.json");

const cookieAuth = require("./cookieAuth");
const createError = require("http-errors");

/**
 * Authenticate user
 * @param {import("aws-lambda").APIGatewayProxyEvent} apiEvent - HTTP request
 * @param {Object} options - Options
 * @param {string} [options.role] - Role to check
 * @param {string} [options.name] - Name to check
 * @returns {cookieAuth.JwtPayload} - User object
 */
const authenticate = (apiEvent, options = {}) => {
  try {
    const accessTokenParsed = cookieAuth.parseSessionCookie(apiEvent);
    // check if user exists
    if (!users[accessTokenParsed.name]) {
      throw new Error("User not found");
    }

    // check if user has the required role
    if (options.role && options.role !== accessTokenParsed.role) {
      throw new Error("User has wrong role");
    }

    // check if user has the required name (only for non-admins)
    if (
      !(accessTokenParsed.role == "admin") &&
      options.name &&
      options.name !== accessTokenParsed.name
    ) {
      throw new Error("User has wrong name");
    }

    return accessTokenParsed;
  } catch (err) {
    console.log(err);
    throw new createError.Unauthorized("Unauthorized");
  }
};

module.exports = {
  authenticate,
  users,
};
