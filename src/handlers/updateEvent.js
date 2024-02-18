// @ts-check

const createError = require("http-errors");
const handlerHelper = require("../handlerHelper");
const access = require("../accessControl");
const { EventsModel } = require("../model/events2.model");
const i18n = require("../i18n");

/**
 * body schema for the PUT request
 * @type {import("../handlerHelper").BodySchema}
 */
const bodySchema = {
  id: { type: "string", required: true },
  title: { type: "string", required: true },
  start: { type: "ISOdate", required: true },
  end: { type: "ISOdate", required: true },
};

/**
 * AWS Lambda function handler to update an event in a DynamoDB table
 * @param {handlerHelper.ApiEventParsed} apiEvent - HTTP request with body parsed
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>} - AWS Lambda HTTP response
 */
const updateEvent = async (apiEvent) => {
  if (apiEvent.httpMethod !== "PUT") {
    throw new createError.BadRequest(
      i18n.t("error.wrongMethod", {
        handler: "updateEvent.handler",
        method: "PUT",
      })
    );
  }

  const eventId = apiEvent.pathParameters?.id;
  if (eventId === undefined) {
    throw new createError.BadRequest(i18n.t("error.missingIdinPath"));
  }

  const events = new EventsModel();
  const eventFromDb = await events.get(eventId);
  access.authenticate(apiEvent, { name: eventFromDb.title });

  const updatedEvent = await events.update(apiEvent.bodyParsed);
  updatedEvent.color = access.users[updatedEvent.title].color;

  return {
    statusCode: 200,
    body: JSON.stringify(updatedEvent),
  };
};

exports.handler = handlerHelper.apiHandler(updateEvent, {
  bodySchema: bodySchema,
});
