// @ts-check

const createError = require("http-errors");
const handlerHelper = require("../handlerHelper");
const { UsersModel: Users } = require("../model/users.model");
const jwt = require("jsonwebtoken");
const { getSecret } = require("../secrets");
const { createSessionCookie } = require("../cookieAuth");
const {
  EventsModelNoLock: EventsModel,
} = require("../model/events.model-DynNoLock");

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
const testHandler = async (apiEvent) => {
  switch (apiEvent.httpMethod) {
    case "GET":
      return getAuthToken(apiEvent);
    case "POST":
      return batchCreateEvents(apiEvent);
    case "DELETE":
      return deleteEvents(apiEvent);
    default:
      throw new createError.BadRequest("Invalid HTTP method. Use GET");
  }
};

/**
 * Get auth token
 * @param {handlerHelper.ApiEventParsed} apiEvent - HTTP request with body parsed
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>} - AWS Lambda HTTP response
 */
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

/**
 * Create events in batch
 * @param {handlerHelper.ApiEventParsed} apiEvent - HTTP request with body parsed
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>} - AWS Lambda HTTP response
 */
const batchCreateEvents = async (apiEvent) => {
  const events = new EventsModel();
  const eventsData = JSON.parse(apiEvent.body);
  const createdEvents = await events.batchCreate(eventsData);

  return {
    statusCode: 200,
    body: JSON.stringify(createdEvents),
  };
};

/**
 * Delete events, by year as provided in path /events/{year}
 * @param {handlerHelper.ApiEventParsed} apiEvent - HTTP request with body parsed
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>} - AWS Lambda HTTP response
 */
const deleteEvents = async (apiEvent) => {
  const year = apiEvent.pathParameters?.year;
  if (!year) {
    throw new createError.BadRequest("Missing year in path");
  }
  // delete events
  const events = new EventsModel();
  await events.deleteEventsByYear(year);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: `Deleted events for year ${year}` }),
  };
};

exports.handler = handlerHelper.apiHandler(testHandler);
