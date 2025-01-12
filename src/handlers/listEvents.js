// @ts-check

const { HttpError, createLambdaHandler } = require("../common/lambdaHandler");
const { EventsModelNoLock } = require("../model/events.model-DynNoLock");
const { UsersModel: Users } = require("../model/users.model");

// init dynamodb during cold start, since we get more CPU
const events = new EventsModelNoLock();

/**
 * AWS Lambda function handler to list events in a DynamoDB table
 * @param {import("../common/lambdaHandler").Request} request - HTTP request
 * @returns {Promise<import("../model/events2.model").Event[]>} - list of events
 */
const listEvents = async (request) => {
  const result = await events.list(request.query.start, request.query.end);
  return result.map((event) => {
    event.color = new Users().getUserColor(event.title);
    return event;
  });
};

const handlerOptions = {
  validate: {
    method: "GET",
    handler: "listEvents2.handler",
  },
  /**
   * @type {import("../common/parseQueryString").QuerySchema}
   */
  querySchema: {
    start: { type: "ISOdate", required: true },
    end: { type: "ISOdate", required: true },
  },
};

export const handler = createLambdaHandler(listEvents, handlerOptions);
