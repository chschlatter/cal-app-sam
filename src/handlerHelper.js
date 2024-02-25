"use strict";

const createError = require("http-errors");
const { EventsError } = require("./model/events2.model");
const { AccessError } = require("./accessControl");
const i18n = require("./i18n");

/**
 * @typedef {Object} ApiEventParsed
 * @extends {import("aws-lambda").APIGatewayProxyEvent}
 * @property {Object} bodyParsed
 *
 * @typedef {Object.<string, {type: string, required: boolean}>} BodySchema
 */

/**
 * This function is a wrapper around the AWS Lambda function handler.
 * It logs the request and response, and handles errors.
 * It also validates the request body against a schema if provided.
 * @param {function} handler - the AWS Lambda function handler
 * @param {object} options - an object containing the body schema
 * @param {BodySchema} [options.bodySchema] - the body schema to validate the request body
 * @returns {function} - the wrapped AWS Lambda function handler
 */
exports.apiHandler = (handler, options = {}) => {
  return async (event) => {
    let response;
    try {
      // Log the request
      console.info({
        path: event.path,
        method: event.httpMethod,
        query: event.queryStringParameters,
        body: event.body,
      });

      // handle warm up events
      if (event.queryStringParameters?.warmup) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "Warm up event received",
          }),
        };
      }

      if (options.bodySchema) {
        const body = JSON.parse(event.body);
        Object.entries(options.bodySchema).forEach(([key, value]) => {
          if (body[key] === undefined) {
            if (value.required) {
              throw new createError.BadRequest(
                `Missing required field: ${key}`
              );
            }
          } else {
            if (value.type === "ISOdate") {
              if (isNaN(Date.parse(body[key]))) {
                throw new createError.BadRequest(
                  `Invalid date for field ${key}: ${body[key]}`
                );
              }
            } else if (typeof body[key] !== value.type) {
              throw new createError.BadRequest(
                `Invalid type for field ${key}: ${typeof body[key]}`
              );
            }
          }
        });
        event.bodyParsed = body;
      }

      response = await handler(event);
    } catch (err) {
      response = handleErrors(err);
    }

    return response;
  };
};

/**
 * Handle errors and return an HTTP response
 * @param {Object} err
 * @returns {import("aws-lambda").APIGatewayProxyResult}
 */
const handleErrors = (err) => {
  let response = {
    statusCode: 500,
    body: JSON.stringify({
      message: i18n.t("error.internalServerError"),
    }),
  };

  if (err instanceof EventsError) {
    switch (err.code) {
      case "start_end_required":
        err = new createError.BadRequest(i18n.t("error.listEvents.startEnd"));
        break;
      case "event_not_found":
        err = new createError.NotFound(i18n.t("error.eventNotFound"));
        break;
      case "event_overlaps":
        err = createError(409, i18n.t("error.eventOverlaps"), err.data);
        break;
      case "event_max_days":
        err = createError(
          400,
          i18n.t("error.eventMaxDays", { maxDays: err.data.maxDays }),
          err.data
        );
        break;
      default:
        err = new createError.InternalServerError(
          i18n.t("error.unknownEventError", { message: err.message })
        );
    }
  }

  if (err instanceof AccessError) {
    switch (err.code) {
      case "unauthorized":
        err = new createError.Unauthorized(i18n.t("error.unauthorized"));
        break;
      default:
        err = new createError.InternalServerError(
          i18n.t("error.unknownAccessError", { message: err.message })
        );
    }
  }

  // err properties are statusCode, message, and data
  if (createError.isHttpError(err)) {
    response = {
      statusCode: err.statusCode,
      body: JSON.stringify(err),
    };
  }

  console.log(err);
  return response;
};
