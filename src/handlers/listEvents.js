"use strict";

const createError = require("http-errors");
const api = require("../api");

// Get the DynamoDB table name from environment variables
const tableName = process.env.EVENTS_TABLE;
const events = require("../model/events.model");

// AWS Lambda function handler to list events from a DynamoDB table
// between two dates.
const lambdaHandler = async (event) => {
  if (event.httpMethod !== "GET") {
    throw new createError.BadRequest(
      "listEvents.handler only accepts GET method"
    );
  }

  if (
    !event.queryStringParameters ||
    !event.queryStringParameters.start ||
    !event.queryStringParameters.end
  ) {
    throw new createError.BadRequest(
      "Please provide start and end query params!"
    );
  }

  const start = event.queryStringParameters.start;
  const end = event.queryStringParameters.end;

  const startTime = new Date().getTime();
  const items = await events.list(start, end, api.ddbDocClient, tableName);
  console.log("events.list() (ms):", new Date().getTime() - startTime);

  const response = {
    statusCode: 200,
    body: JSON.stringify(items),
  };

  return response;
};

exports.handler = api.apiHandler(lambdaHandler);
