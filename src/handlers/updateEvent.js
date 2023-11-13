"use strict";

const createError = require("http-errors");
const api = require("../api");

// Get the DynamoDB table name from environment variables
const eventsTable = process.env.EVENTS_TABLE;

const events = require("../model/events.model");

// ajv jtd event schema used for input validation
const bodySchema = {
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    start: { type: "timestamp" },
    end: { type: "timestamp" },
  },
};

// AWS Lambda function handler to create an event in a DynamoDB table
const lambdaHandler = async (event) => {
  if (event.httpMethod !== "PUT") {
    throw new createError.BadRequest(
      "listEvents.handler only accepts POST method"
    );
  }

  event.id = event.pathParameters.id;
  event = await events.update(event.bodyParsed, api.ddbDocClient, eventsTable);

  const response = {
    statusCode: 200,
    body: JSON.stringify(event),
  };

  return response;
};

exports.handler = api.apiHandler(lambdaHandler, { bodySchema: bodySchema });
