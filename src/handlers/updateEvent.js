// @ts-check

const i18n = require("../i18n");
const { HttpError } = require("../common/httpError");
const { UsersModel: Users } = require("../model/users.model");
const { createLambdaHandler } = require("../common/lambdaHandler");
const {
  EventsModelNoLock,
  EventsError,
} = require("../model/events.model-DynNoLock");

// init dynamodb during cold start, since we get more CPU
const events = new EventsModelNoLock();

const handlerOptions = {
  validate: {
    method: "PUT",
    handler: "updateEvent.handler",
  },
  /**
   * @type {import("../common/parseRequestBody").BodySchema}
   */
  bodySchema: {
    id: { type: "string", required: true },
    title: { type: "string", required: true },
    start: { type: "ISOdate", required: true },
    end: { type: "ISOdate", required: true },
  },
  /**
   * @type {import("../common/parsePathParameters").PathSchema}
   */
  pathSchema: ["id"],
};

/**
 * AWS Lambda function handler to update an event
 * @param {import("../common/lambdaHandler").Request} request - HTTP request
 * @returns {Promise<import("../model/events2.model").Event>} - created event
 */
const updateEvent = async (request) => {
  // get event id from path
  const eventId = request.path?.id;
  if (eventId === undefined) {
    throw new HttpError(400, i18n.t("error.missingIdinPath"));
  }

  try {
    const eventFromDb = await events.get(eventId);

    if (request.body.id !== eventId) {
      throw new HttpError(400, i18n.t("error.idMismatch"));
    }

    // authorize user
    if (request.user.role !== "admin") {
      if (
        request.user.name !== eventFromDb.title ||
        request.user.name !== request.body.title
      ) {
        throw new HttpError(403, i18n.t("error.unauthorized"));
      }
    }

    const updatedEvent = await events.update(eventFromDb, request.body);
    updatedEvent.color = new Users().getUserColor(updatedEvent.title);
    return updatedEvent;
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
        case "event_updated":
          throw new HttpError(409, i18n.t("error.eventUpdated"));
        default:
          throw new HttpError(
            500,
            i18n.t("error.unknownEventError", { message: err.message })
          );
      }
    }
    throw err;
  }
};

export const handler = createLambdaHandler(updateEvent, handlerOptions);
