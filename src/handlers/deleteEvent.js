// @ts-check

const i18n = require("../i18n");
const {
  EventsModelNoLock,
  EventsError,
} = require("../model/events.model-DynNoLock");

import middy from "@middy/core";
import { getMiddlewares, createApiError } from "../common/middyDefaults.js";

// init dynamodb during cold start, since we get more CPU
const events = new EventsModelNoLock();

/**
 * Lambda function handler to delete an event in a DynamoDB table
 * @param {import("aws-lambda").APIGatewayEvent} event
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>}
 */
const deleteEventHandler = async (event, context) => {
  try {
    const eventFromDb = await events.get(context.validationResult.params["id"]);

    // authorize user
    if (
      context.user.role !== "admin" &&
      context.user.name !== eventFromDb.title
    ) {
      throw createApiError(403, i18n.t("error.unauthorized"));
    }

    await events.remove(eventFromDb);
  } catch (err) {
    if (err instanceof EventsError) {
      switch (err.code) {
        case "event_not_found":
          throw createApiError(400, i18n.t("error.eventNotFound"));
        case "event_updated":
          throw createApiError(409, i18n.t("error.eventUpdated"));
      }
    }
    throw err;
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Event deleted" }),
  };
};

export const handler = middy()
  .use(getMiddlewares({ jsonBody: false }))
  .handler(deleteEventHandler);
