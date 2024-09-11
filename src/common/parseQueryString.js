//@ts-check

const i18n = require("../i18n");
const { HttpError } = require("./httpError");

/**
 * @typedef {"string" | "number" | "boolean" | "ISOdate" } ValueType
 * @typedef {Object.<string, {type: ValueType, required: boolean}>} QuerySchema
 */

/**
 * Parse the query string
 * @param {import("aws-lambda").APIGatewayProxyEvent} event - HTTP request
 * @param {QuerySchema} schema - schema for the query string
 * @returns {Object} - parsed query string
 */
export const parseQueryString = (event, schema) => {
  const query = {};
  for (const key in schema) {
    if (schema[key].required && !event.queryStringParameters?.[key]) {
      throw new HttpError(
        400,
        i18n.t("errors.missingRequiredProperty", { property: key })
      );
    }
    if (schema[key].type === "ISOdate") {
      if (!new Date(event.queryStringParameters?.[key] || "")) {
        throw new HttpError(
          400,
          i18n.t("errors.invalidDateFormat", { property: key })
        );
      }
    } else if (typeof event.queryStringParameters?.[key] !== schema[key].type) {
      throw new HttpError(
        400,
        i18n.t("errors.invalidType", { property: key, type: schema[key].type })
      );
    }
    query[key] = event.queryStringParameters?.[key];
  }
  return query;
};
