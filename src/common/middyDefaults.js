import * as validatorModule from "../../build/validator.js";
import httpErrorHandler from "@middy/http-error-handler";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import httpErrorJsonFormatter, {
  createApiError,
} from "../middleware/http-error-json-formatter";
import validator from "../middleware/http-openapi-validator.js";
import jwtAuth from "../middleware/jwt-auth.js";
import isDate from "validator/es/lib/isDate";

const { getSecret } = require("../secrets");

/**
 * @typedef {Omit<import("aws-lambda").APIGatewayEvent, "body"> & {
 *   body: Object
 * }} APIGatewayEventWithParsedBody
 */

const stringFormats = {
  date: (value, path) =>
    isDate(value, { format: "YYYY-MM-DD", strictMode: true })
      ? null
      : new validatorModule.ValidationError(path, "Invalid date"),
};

export const getMiddlewares = (opts = {}) => {
  const defaults = {
    noAuth: false,
    jsonBody: true,
  };
  const options = { ...defaults, ...opts };
  const middlewares = [];
  middlewares.push(httpHeaderNormalizer());
  if (!options.noAuth) {
    middlewares.push(jwtAuth({ secret: getSecret("JWT_SECRET") }));
  }
  if (options.jsonBody) {
    middlewares.push(httpJsonBodyParser());
  }
  middlewares.push(
    validator({ validatorModule, stringFormats }),
    httpErrorJsonFormatter(),
    httpErrorHandler({ fallbackMessage: "Internal server error" })
  );
  return middlewares;
};

export { createApiError } from "../middleware/http-error-json-formatter.js";
