// @ts-check

const i18n = require("../i18n");
const { HttpError, createLambdaHandler } = require("../common/lambdaHandler");
const { EventsModel } = require("../model/events2.model");

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
  const events = new EventsModel();
  const eventFromDb = await events.get(request.path.id);
  // authorize user
  if (
    request.user.role !== "admin" &&
    request.user.name !== eventFromDb.title
  ) {
    throw new HttpError(403, i18n.t("error.unauthorized"));
  }
  await events.remove(request.path.id);
  return { message: "Event deleted" };
};

exports.handler = createLambdaHandler(deleteEvent, handlerOptions);
