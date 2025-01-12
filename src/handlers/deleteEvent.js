// @ts-check

const i18n = require("../i18n");
const { HttpError, createLambdaHandler } = require("../common/lambdaHandler");
const {
  EventsModelNoLock,
  EventsError,
} = require("../model/events.model-DynNoLock");

// init dynamodb during cold start, since we get more CPU
const events = new EventsModelNoLock();

const handlerOptions = {
  validate: {
    method: "DELETE",
    handler: "deleteEvent.handler",
  },
  /**
   * @type {import("../common/parsePathParameters").PathSchema}
   */
  pathSchema: ["id"],
};

/**
 * AWS Lambda function handler to delete an event in a DynamoDB table
 * @param {import("../common/lambdaHandler").Request} request - HTTP request
 * @returns {Promise<{ message: string }>} - message
 */
const deleteEvent = async (request) => {
  // get event from db
  const eventFromDb = await events.get(request.path.id);
  // authorize user
  if (
    request.user.role !== "admin" &&
    request.user.name !== eventFromDb.title
  ) {
    throw new HttpError(403, i18n.t("error.unauthorized"));
  }

  try {
    await events.remove(eventFromDb);
  } catch (err) {
    if (err instanceof EventsError) {
      switch (err.code) {
        case "event_not_found":
          throw new HttpError(400, i18n.t("error.eventNotFound"));
        case "event_updated":
          throw new HttpError(409, i18n.t("error.eventUpdated"));
      }
    }
    throw err;
  }

  return { message: "Event deleted" };
};

exports.handler = createLambdaHandler(deleteEvent, handlerOptions);
