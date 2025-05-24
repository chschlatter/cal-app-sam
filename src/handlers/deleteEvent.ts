import i18n from "../i18n";
import {
  EventsModelNoLock,
  EventsError,
} from "../model/events.model-DynNoLock";
import {
  type APIGatewayEventWithParsedBody,
  type ContextWithUser,
} from "../common/middyDefaults.js";

import middy from "@middy/core";
import { getMiddlewares, createApiError } from "../common/middyDefaults.js";
import type { APIGatewayProxyResult } from "aws-lambda";
import httpOpenapiValidator from "../middleware/http-openapi-validator.js";
import jwtAuth from "../middleware/jwt-auth.js";
import { getSecret } from "../secrets.js";

// init dynamodb during cold start, since we get more CPU
const events = new EventsModelNoLock();

const middlewares = middy<
  APIGatewayEventWithParsedBody,
  APIGatewayProxyResult
>()
  // .use(getMiddlewares({ jsonBody: false }))
  .use(
    jwtAuth({
      secret: getSecret("JWT_SECRET"),
      setToContext: true,
    })
  )
  .use(
    httpOpenapiValidator({
      validatorModule: undefined,
      stringFormats: {},
      setToContext: true,
    })
  );

export const handler = middlewares.handler(async (_event, context) => {
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
});
