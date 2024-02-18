// @ts-check

const handlerHelper = require("../handlerHelper");
const createError = require("http-errors");
const access = require("../accessControl");
const { EventsModel } = require("../model/events2.model");
const i18n = require("../i18n");

/**
 * AWS Lambda function handler to list events in a DynamoDB table
 * @param {handlerHelper.ApiEventParsed} apiEvent - HTTP request with body parsed
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>} - AWS Lambda HTTP response
 */
const listEvents = async (apiEvent) => {
  if (apiEvent.httpMethod !== "GET") {
    throw new createError.BadRequest(
      i18n.t("error.wrongMethod", {
        handler: "listEvents.handler",
        method: "GET",
      })
    );
  }

  access.authenticate(apiEvent);

  const start = apiEvent.queryStringParameters?.start;
  const end = apiEvent.queryStringParameters?.end;

  if (!start || !end) {
    throw new createError.BadRequest(i18n.t("error.listEvents.startEnd"));
  }

  const events = new EventsModel();
  const items = await events.list(start, end);

  return {
    statusCode: 200,
    body: JSON.stringify(items),
  };
};

exports.handler = handlerHelper.apiHandler(listEvents);
