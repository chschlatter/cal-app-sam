// @ts-check

const createError = require("http-errors");
const handlerHelper = require("../handlerHelper");
const access = require("../accessControl");
const { EventsModel } = require("../model/events2.model");

/**
 * body schema for the POST request
 * @type {import("../handlerHelper").BodySchema}
 */
const bodySchema = {
  title: { type: "string", required: true },
  start: { type: "ISOdate", required: true },
  end: { type: "ISOdate", required: true },
};

/**
 * AWS Lambda function handler to create an event in a DynamoDB table
 * @param {handlerHelper.ApiEventParsed} apiEvent - HTTP request with body parsed
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>} - AWS Lambda HTTP response
 */
const createEvent = async (apiEvent) => {
  if (apiEvent.httpMethod !== "POST") {
    throw new createError.BadRequest(
      "listEvents.handler only accepts POST method"
    );
  }

  // authenticate user
  access.authenticate(apiEvent, { name: apiEvent.bodyParsed.title });

  const events = new EventsModel();
  const event = await events.create(apiEvent.bodyParsed);
  event.color = access.users[event.title].color;

  return {
    statusCode: 200,
    body: JSON.stringify(event),
  };
};

exports.handler = handlerHelper.apiHandler(createEvent, {
  bodySchema: bodySchema,
});
