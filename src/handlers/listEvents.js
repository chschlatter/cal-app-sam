// @ts-check

const i18n = require("../i18n");
const {
  EventsModelNoLock,
  EventsError,
} = require("../model/events.model-DynNoLock");
const { UsersModel: Users } = require("../model/users.model");

import middy from "@middy/core";
import { getMiddlewares, createApiError } from "../common/middyDefaults.js";

// init dynamodb during cold start, since we get more CPU
const events = new EventsModelNoLock();

/**
 * Lambda function handler to list events
 * @param {import("aws-lambda").APIGatewayEvent} event
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>}
 */
const listEventsHandler = async (event) => {
  const { start: startDate, end: endDate } = event.queryStringParameters || {};
  try {
    const result = await events.list(startDate, endDate);
    return {
      statusCode: 200,
      body: JSON.stringify(
        result.map((event) => {
          event.color = new Users().getUserColor(event.title);
          return event;
        })
      ),
    };
  } catch (error) {
    if (error instanceof EventsError) {
      switch (error.code) {
        case "start_end_required":
          throw createApiError(400, i18n.t("error.listEvents.startEnd"));
        case "end_before_start":
          throw createApiError(400, i18n.t("error.listEvents.endBeforeStart"));
      }
    }
    throw error;
  }
};

export const handler = middy()
  .use(getMiddlewares({ jsonBody: false }))
  .handler(listEventsHandler);
