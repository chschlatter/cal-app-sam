// @ts-check

const i18n = require("../i18n");
const { HttpError } = require("../common/httpError");
const { UsersModel: Users } = require("../model/users.model");
const { createLambdaHandler } = require("../common/lambdaHandler");
const {
  EventsModelNoLock,
  EventsError,
} = require("../model/events.model-DynNoLock");

const handlerOptions = {
  validate: {
    method: "POST",
    handler: "createEvent.handler",
  },
  /**
   * @type {import("../common/parseRequestBody").BodySchema}
   */
  bodySchema: {
    title: { type: "string", required: true },
    start: { type: "ISOdate", required: true },
    end: { type: "ISOdate", required: true },
  },
};

// init dynamodb during cold start, since we get more CPU
const events = new EventsModelNoLock();

/**
 * AWS Lambda function handler to create an event in a DynamoDB table
 * @param {import("../common/lambdaHandler").Request} request - HTTP request
 * @returns {Promise<import("../model/events2.model").Event>} - created event
 */
const createEvent = async (request) => {
  const newEvent = {
    id: "",
    ...request.body,
  }; /* @type {import("../model/events2.model").Event} */

  // authorize user
  if (request.user.role !== "admin") {
    if (request.user.name !== newEvent.title) {
      throw new HttpError(403, i18n.t("error.unauthorized"));
    }
  }

  try {
    const createdEvent = await events.create(newEvent);
    createdEvent.color = new Users().getUserColor(createdEvent.title);
    return createdEvent;
  } catch (err) {
    if (err instanceof EventsError) {
      switch (err.code) {
        case "start_end_required":
          throw new HttpError(400, i18n.t("error.listEvents.startEnd"));
        case "event_not_found":
          throw new HttpError(400, i18n.t("error.eventNotFound"));
        case "event_overlaps":
          throw new HttpError(409, i18n.t("error.eventOverlaps"), err.data);
        case "event_max_days":
          throw new HttpError(
            400,
            i18n.t("error.eventMaxDays", { maxDays: err.data.maxDays }),
            err.data
          );
        case "event_min_days":
          throw new HttpError(
            400,
            i18n.t("error.eventMinDays", { minDays: err.data.minDays }),
            err.data
          );
        case "event_validation":
          throw new HttpError(400, i18n.t("error.eventValidation"), err.data);
        default:
          throw new HttpError(
            500,
            i18n.t("error.unknownEventError", { message: err.message })
          );
      }
    } else {
      throw err;
    }
  }
};

export const handler = createLambdaHandler(createEvent, handlerOptions);
