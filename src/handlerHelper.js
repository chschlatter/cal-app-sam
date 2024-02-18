"use strict";

const createError = require("http-errors");

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
          if (value.required && !body[key]) {
            throw new createError.BadRequest(`Missing required field: ${key}`);
          }
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
        });
        event.bodyParsed = body;
      }

      response = await handler(event);
    } catch (err) {
      response = {
        statusCode: 500,
        body: JSON.stringify({
          message: "Internal server error",
        }),
      };

      // err properties are statusCode, message, and data
      if (createError.isHttpError(err)) {
        response = {
          statusCode: err.statusCode,
          body: JSON.stringify(err),
        };
      }

      console.log(err);
    }
    return response;
  };
};
