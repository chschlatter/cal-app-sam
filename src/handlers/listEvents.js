// @ts-check

const i18n = require("../i18n");
const {
  EventsModelNoLock,
  EventsError,
} = require("../model/events.model-DynNoLock");
const { UsersModel: Users } = require("../model/users.model");
const { getSecret } = require("../secrets");

import * as validatorModule from "../../build/validator";
import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpErrorJsonFormatter, {
  createApiError,
} from "../middleware/http-error-json-formatter";
import validator from "../middleware/http-openapi-validator";
import jwtAuth from "../middleware/jwt-auth";

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
  .use(httpHeaderNormalizer())
  .use(jwtAuth({ secret: getSecret("JWT_SECRET") }))
  .use(validator({ validatorModule }))
  .use(httpErrorJsonFormatter())
  .use(httpErrorHandler({ fallbackMessage: "Internal server error" }))
  .handler(listEventsHandler);
