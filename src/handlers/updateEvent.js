// @ts-check

const i18n = require("../i18n");
const { HttpError } = require("../common/httpError");
const { createLambdaHandler } = require("../common/lambdaHandler");
const { EventsModel, EventsError } = require("../model/events2.model");

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
    const events = new EventsModel();
    const eventFromDb = await events.get(eventId);

    // authorize user
    if (request.user.role !== "admin") {
      if (
        request.user.name !== eventFromDb.title ||
        request.user.name !== request.body.title
      ) {
        throw new HttpError(403, i18n.t("error.unauthorized"));
      }
    }

    return await events.update(request.body);
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
        case "event_validation":
          throw new HttpError(400, i18n.t("error.eventValidation"), err.data);
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
