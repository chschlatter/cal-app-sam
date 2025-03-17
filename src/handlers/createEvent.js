// @ts-check

const i18n = require("../i18n");
const { UsersModel: Users } = require("../model/users.model");
const {
  EventsModelNoLock,
  EventsError,
} = require("../model/events.model-DynNoLock");

import middy from "@middy/core";
import { getMiddlewares, createApiError } from "../common/middyDefaults.js";

// init dynamodb during cold start, since we get more CPU
const events = new EventsModelNoLock();

/**
 * Lambda function handler to create an event in a DynamoDB table
 * @param {import('../common/middyDefaults.js').APIGatewayEventWithParsedBody} event
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>}
 */
const createEventHandler = async (event, context) => {
  /* @type {import("../model/events2.model").Event} */
  const newEvent = {
    id: "",
    ...event.body,
  };

  // authorize user
  if (context.user.role !== "admin") {
    if (context.user.name !== newEvent.title) {
      throw createApiError(403, i18n.t("error.unauthorized"));
    }
  }

  try {
    const createdEvent = await events.create(newEvent);
    createdEvent.color = new Users().getUserColor(createdEvent.title);
    return {
      statusCode: 201,
      body: JSON.stringify(createdEvent),
    };
  } catch (err) {
    if (err instanceof EventsError) {
      switch (err.code) {
        case "start_end_required":
          throw createApiError(400, i18n.t("error.listEvents.startEnd"));
        case "event_not_found":
          throw createApiError(400, i18n.t("error.eventNotFound"));
        case "event_overlaps":
          throw createApiError(409, i18n.t("error.eventOverlaps"), err.data);
        case "event_max_days":
          throw createApiError(
            400,
            i18n.t("error.eventMaxDays", { maxDays: err.data.maxDays }),
            err.data
          );
        case "event_min_days":
          throw createApiError(
            400,
            i18n.t("error.eventMinDays", { minDays: err.data.minDays }),
            err.data
          );
        case "event_validation":
          throw createApiError(400, i18n.t("error.eventValidation"), err.data);
        default:
          throw createApiError(
            500,
            i18n.t("error.unknownEventError", { message: err.message })
          );
      }
    } else {
      throw err;
    }
  }
};

export const handler = middy()
  .use(getMiddlewares())
  .handler(createEventHandler);
