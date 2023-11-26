"use strict";

const db = require("../db");
const handlerHelper = require("../handlerHelper");
const access = require("../accessControl");

// Get the DynamoDB table name from environment variables
const eventsTable = process.env.EVENTS_TABLE;
const events = require("../model/events.model");

// AWS Lambda function handler to delete an event in a DynamoDB table
const deleteEvent = async (event) => {
  // wait for db to be initialized
  await db.dbInitPromise;

  if (event.httpMethod !== "DELETE") {
    throw new createError.BadRequest(
      "deleteEvent.handler only accepts DELETE method"
    );
  }

  event.id = event.pathParameters?.id;
  if (event.id === undefined) {
    throw new createError.BadRequest("Please provide id in path");
  }

  const eventFromDb = await events.get(event.id, db.client, eventsTable);
  access.authenticate(event, { name: eventFromDb.title });

  await events.remove(event.id, db.client, eventsTable);

  return {
    statusCode: 200,
    body: JSON.stringify({}),
  };
};

exports.handler = handlerHelper.apiHandler(deleteEvent);
