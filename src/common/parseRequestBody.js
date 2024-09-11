//@ts-check

const i18n = require("../i18n");
const { HttpError } = require("./httpError");

/**
 * @typedef {"string" | "number" | "boolean" | "ISOdate"} ValueType
 * @typedef {Object.<string, {type: ValueType, required: boolean}>} BodySchema
 */

/**
 * Parse the request body
 * @param {import("aws-lambda").APIGatewayProxyEvent} event - HTTP request
 * @param {BodySchema} schema - schema for the request body
 * @returns {Object} - parsed request body
 */
export const parseRequestBody = (event, schema) => {
  if (event.body) {
    try {
      const body = JSON.parse(event.body);
      for (const key in schema) {
        if (schema[key].required && !body[key]) {
          throw new HttpError(
            400,
            i18n.t("errors.missingRequiredProperty", { property: key })
          );
        }
        if (schema[key].type === "ISOdate") {
          const date = new Date(body[key]);
          if (isNaN(date.getTime())) {
            throw new HttpError(
              400,
              i18n.t("errors.invalidDateFormat", { property: key })
            );
          }
        } else if (typeof body[key] !== schema[key].type) {
          throw new HttpError(
            400,
            i18n.t("errors.invalidType", {
              property: key,
              type: schema[key].type,
            })
          );
        }
      }
      return body;
    } catch (error) {
      console.error("Error parsing request body", error);
      throw new HttpError(400, i18n.t("errors.invalidJSONRequestBody"));
    }
  } else {
    throw new HttpError(400, i18n.t("errors.missingRequestBody"));
  }
};
