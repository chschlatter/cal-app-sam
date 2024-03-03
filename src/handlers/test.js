// @ts-check

const createError = require("http-errors");
const handlerHelper = require("../handlerHelper");
const { UsersModel: Users } = require("../model/users.model");
const jwt = require("jsonwebtoken");
const { getSecret } = require("../secrets");
const { createSessionCookie } = require("../cookieAuth");

/**
 * body schema for the POST request
 * @type {import("../handlerHelper").BodySchema}
 */
/*
const bodySchema = {
  title: { type: "string", required: true },
  start: { type: "ISOdate", required: true },
  end: { type: "ISOdate", required: true },
};
*/

/**
 * @typedef {Object} UsernameTokenPayload
 * @extends {jwt.JwtPayload}
 * @property {string} username
 */

/**
 * AWS Lambda function handler to create an event in a DynamoDB table
 * @param {handlerHelper.ApiEventParsed} apiEvent - HTTP request with body parsed
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>} - AWS Lambda HTTP response
 */
const authHandler = async (apiEvent) => {
  switch (apiEvent.httpMethod) {
    case "GET":
      return await getAuthToken(apiEvent);
    default:
      throw new createError.BadRequest("Invalid HTTP method. Use GET");
  }
};

const getAuthToken = async (apiEvent) => {
  // parse query string: ?jwt=...
  const usernameToken = apiEvent.queryStringParameters?.jwt;
  if (!usernameToken) {
    throw new createError.BadRequest("Missing jwt");
  }

  // verify jwt, get username
  const decoded = jwt.verify(usernameToken, getSecret("JWT_SECRET"));
  if (typeof decoded === "object") {
    if (!decoded.username) {
      throw new createError.BadRequest("Invalid jwt");
    }
    const username = decoded.username;
    const userRole = new Users().getUserRole(username);
    if (!userRole) {
      throw new createError.BadRequest("Could not find user role");
    }
    const authToken = createSessionCookie(username, userRole);
    return {
      statusCode: 200,
      body: JSON.stringify({ token: authToken }),
    };
  } else {
    throw new createError.BadRequest("Invalid jwt");
  }
};

/*
exports.handler = handlerHelper.apiHandler(createEvent, {
  bodySchema: bodySchema,
});
*/
