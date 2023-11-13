"use strict";

const createError = require("http-errors");
const api = require("../api");

// Get the DynamoDB table name from environment variables
const eventsTable = process.env.EVENTS_TABLE;

const events = require("../model/events.model");

// ajv jtd event schema used for input validation
const bodySchema = {
  properties: {
    title: { type: "string" },
    start: { type: "timestamp" },
    end: { type: "timestamp" },
  },
};

// AWS Lambda function handler to create an event in a DynamoDB table
const lambdaHandler = async (event) => {
  if (event.httpMethod !== "POST") {
    throw new createError.BadRequest(
      "listEvents.handler only accepts POST method"
    );
  }

  event = await events.create(event.bodyParsed, api.ddbDocClient, eventsTable);

  const response = {
    statusCode: 200,
    body: JSON.stringify(event),
  };

  return response;
};

exports.handler = api.apiHandler(lambdaHandler, { bodySchema: bodySchema });
