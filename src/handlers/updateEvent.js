"use strict";

const createError = require("http-errors");
const db = require("../db");
const handlerHelper = require("../handlerHelper");
const users = require("../../users.json");
const access = require("../accessControl");

// Get the DynamoDB table name from environment variables
const eventsTable = process.env.EVENTS_TABLE;
const events = require("../model/events.model");

// body schema for the PUT request
const bodySchema = {
  id: { type: "string", required: true },
  title: { type: "string", required: true },
  start: { type: "ISOdate", required: true },
  end: { type: "ISOdate", required: true },
};

const updateEvent = async (event) => {
  if (event.httpMethod !== "PUT") {
    throw new createError.BadRequest(
      "listEvents.handler only accepts POST method"
    );
  }

  event.id = event.pathParameters?.id;
  if (event.id === undefined) {
    throw new createError.BadRequest("Please provide id in path");
  }

  const eventFromDb = await events.get(event.id, db.client, eventsTable);
  access.authenticate(event, { name: eventFromDb.title });

  event = await events.update(event.bodyParsed, db.client, eventsTable);
  event.color = users[event.title].color;

  return {
    statusCode: 200,
    body: JSON.stringify(event),
  };
};

exports.handler = handlerHelper.apiHandler(updateEvent, {
  bodySchema: bodySchema,
});
