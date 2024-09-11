// @ts-check

const { HttpError, createLambdaHandler } = require("../common/lambdaHandler");
const { EventsModel } = require("../model/events2.model");

/**
 * AWS Lambda function handler to list events in a DynamoDB table
 * @param {import("../common/lambdaHandler").Request} request - HTTP request
 * @returns {Promise<import("../model/events2.model").Event[]>} - list of events
 */
const listEvents = async (request) => {
  const events = new EventsModel();
  return await events.list(request.query.start, request.query.end);
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
