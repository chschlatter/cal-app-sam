// @ts-check

const i18n = require("../i18n");
const { HttpError } = require("./httpError");

/**
 * @typedef {{method: string, handler: string, bodySchema?: import("./parseRequestBody").BodySchema}} ValidateOptions
 */

/**
 * Validate the request method
 * @param {import("aws-lambda").APIGatewayProxyEvent} event - HTTP request
 * @param {ValidateOptions} options - options
 */
export const validateRequest = (event, options) => {
  if (options.method && event.httpMethod !== options.method) {
    throw new HttpError(
      400,
      i18n.t("error.wrongMethod", {
        handler: options.handler,
        method: options.method,
      })
    );
  }
};
