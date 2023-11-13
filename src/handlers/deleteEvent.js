"use strict";

const api = require("../api");

// Get the DynamoDB table name from environment variables
const eventsTable = process.env.EVENTS_TABLE;

const events = require("../model/events.model");

// AWS Lambda function handler to delete an event in a DynamoDB table
const lambdaHandler = async (event) => {
  event.id = event.pathParameters.id;
  await events.remove(event.id, api.ddbDocClient, eventsTable);

  const response = {
    statusCode: 200,
    body: JSON.stringify({}),
  };

  return response;
};

exports.handler = api.apiHandler(lambdaHandler);
