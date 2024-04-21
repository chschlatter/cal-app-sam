// @ts-check

const { UsersModel: Users } = require("./model/users.model");
const cookieAuth = require("./cookieAuth");

/**
 * @class AccessError
 * @classdesc Custom error class for access control
 * @extends {Error}
 */
class AccessError extends Error {
  /**
   * @param {string} message
   * @param {"unauthorized"} errorCode
   */
  constructor(message, errorCode) {
    super(message);
    this.code = errorCode;
  }
}

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
    const users = new Users();
    const accessTokenParsed = cookieAuth.parseSessionCookie(apiEvent);
    // check if user exists
    if (!users.getUser(accessTokenParsed.name)) {
      throw new Error("User not found");
    }

    // check if user has the required role
    if (options.role && options.role !== accessTokenParsed.role) {
      throw new Error("User has wrong role");
    }

    // if options.name provided, check if user with that name exists
    if (options.name && !users.getUser(options.name)) {
      throw new Error("User not found");
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
    throw new AccessError("Unauthorized", "unauthorized");
  }
};

module.exports = {
  authenticate,
  AccessError,
};
