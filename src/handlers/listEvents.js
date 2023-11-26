"use strict";

const handlerHelper = require("../handlerHelper");
const createError = require("http-errors");
const db = require("../db");
const access = require("../accessControl");

// Get the DynamoDB table name from environment variables
const tableName = process.env.EVENTS_TABLE;
const events = require("../model/events.model");

const listEvents = async (event) => {
  // wait for db to be initialized
  await db.dbInitPromise;

  if (event.httpMethod !== "GET") {
    throw new createError.BadRequest(
      "listEvents.handler only accepts GET method"
    );
  }

  access.authenticate(event);

  const start = event.queryStringParameters?.start;
  const end = event.queryStringParameters?.end;

  if (!start || !end) {
    throw new createError.BadRequest(
      "Please provide start and end query params"
    );
  }

  const items = await events.list(start, end, db.client, tableName);

  return {
    statusCode: 200,
    body: JSON.stringify(items),
  };
};

exports.handler = handlerHelper.apiHandler(listEvents);
