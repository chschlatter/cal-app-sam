"use strict";

const createError = require("http-errors");
const db = require("../db");
const handlerHelper = require("../handlerHelper");
const users = require("../../users.json");
const access = require("../accessControl");

// Get the DynamoDB table name from environment variables
const eventsTable = process.env.EVENTS_TABLE;
const events = require("../model/events.model");

// body schema for the POST request
const bodySchema = {
  title: { type: "string", required: true },
  start: { type: "ISOdate", required: true },
  end: { type: "ISOdate", required: true },
};

// AWS Lambda function handler to create an event in a DynamoDB table
const createEvent = async (event) => {
  // wait for db to be initialized
  await db.dbInitPromise;

  if (event.httpMethod !== "POST") {
    throw new createError.BadRequest(
      "listEvents.handler only accepts POST method"
    );
  }

  access.authenticate(event, { name: event.bodyParsed.title });

  event = await events.create(event.bodyParsed, db.client, eventsTable);
  event.color = users[event.title].color;

  return {
    statusCode: 200,
    body: JSON.stringify(event),
  };
};

exports.handler = handlerHelper.apiHandler(createEvent, {
  bodySchema: bodySchema,
});
