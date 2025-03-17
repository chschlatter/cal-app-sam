// @ts-check

const i18n = require("../i18n");
const { HttpError } = require("../common/httpError");
const { UsersModel: Users } = require("../model/users.model");
const { createLambdaHandler } = require("../common/lambdaHandler");
const {
  EventsModelNoLock,
  EventsError,
} = require("../model/events.model-DynNoLock");

import middy from "@middy/core";
import { getMiddlewares, createApiError } from "../common/middyDefaults.js";

// init dynamodb during cold start, since we get more CPU
const events = new EventsModelNoLock();

/**
 * Lambda function handler to update an event in a DynamoDB table
 * @param {import('../common/middyDefaults.js').APIGatewayEventWithParsedBody} event
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>}
 */
const updateEventHandler = async (event, context) => {
  const eventId = context.validationResult.params["id"];
  try {
    const eventFromDb = await events.get(eventId);

    if (event.body.id !== eventId) {
      throw createApiError(400, i18n.t("error.idMismatch"));
    }

    // authorize user
    if (context.user.role !== "admin") {
      if (
        context.user.name !== eventFromDb.title ||
        context.user.name !== event.body.title
      ) {
        throw createApiError(403, i18n.t("error.unauthorized"));
      }
    }

    const updatedEvent = await events.update(eventFromDb, event.body);
    updatedEvent.color = new Users().getUserColor(updatedEvent.title);
    return {
      statusCode: 200,
      body: JSON.stringify(updatedEvent),
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
        case "event_updated":
          throw createApiError(409, i18n.t("error.eventUpdated"));
        default:
          throw createApiError(
            500,
            i18n.t("error.unknownEventError", { message: err.message })
          );
      }
    }
    throw err;
  }
};

export const handler = middy()
  .use(getMiddlewares())
  .handler(updateEventHandler);
