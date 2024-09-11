//@ts-check

const i18n = require("../i18n");
const { HttpError } = require("./httpError");

/**
 * @typedef {Array<string>} PathSchema
 */

/**
 * Parse path parameters
 * @param {import("aws-lambda").APIGatewayProxyEvent} event - HTTP request
 * @param {PathSchema} schema - schema for the path parameters
 * @returns {Object} - parsed path parameters
 */
export const parsePathParameters = (event, schema) => {
  const pathParams = event.pathParameters || {};
  const params = {};
  for (const key of schema) {
    if (!pathParams[key]) {
      throw new HttpError(
        400,
        i18n.t("errors.missingPathParameter", { parameter: key })
      );
    }
    params[key] = pathParams[key];
  }
  return params;
};
