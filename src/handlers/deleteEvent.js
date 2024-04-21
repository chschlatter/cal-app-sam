// @ts-check

const createError = require("http-errors");
const handlerHelper = require("../handlerHelper");
const access = require("../accessControl");
const { EventsModel } = require("../model/events2.model");
const i18n = require("../i18n");

/**
 * AWS Lambda function handler to delete an event in a DynamoDB table
 * @param {handlerHelper.ApiEventParsed} apiEvent - HTTP request with body parsed
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>} - AWS Lambda HTTP response
 */
const deleteEvent = async (apiEvent) => {
  try {
    if (apiEvent.httpMethod !== "DELETE") {
      throw new createError.BadRequest(
        i18n.t("error.wrongMethod", {
          handler: "deleteEvent.handler",
          method: "DELETE",
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

    await events.remove(eventId);

    return {
      statusCode: 200,
      body: JSON.stringify({}),
    };
  } catch (error) {
    if (error.code === "event_not_found") {
      throw new createError.NotFound(i18n.t("error.eventNotFound"));
    }
    throw error;
  }
};

exports.handler = handlerHelper.apiHandler(deleteEvent);
