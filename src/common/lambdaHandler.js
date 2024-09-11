// @ts-check

const { Log } = require("lesslog");
const { HttpError } = require("./httpError");
const i18n = require("../i18n");
const { authenticateRequest } = require("./authRequest");
const { validateRequest } = require("./validateRequest");
const { parseRequestBody } = require("./parseRequestBody");
const { parseQueryString } = require("./parseQueryString");
const { parsePathParameters } = require("./parsePathParameters");

/**
 * @typedef {{validate?: import("./validateRequest").ValidateOptions,
 *            bodySchema?: import("./parseRequestBody").BodySchema,
 *            querySchema?: import("./parseQueryString").QuerySchema,
 *            pathSchema?: import("./parsePathParameters").PathSchema}} HandlerOptions
 * @typedef {import("aws-lambda").APIGatewayProxyEvent} APIGatewayProxyEvent
 * @typedef {{body?: Object,
 *            query?: Object,
 *            user: import("../model/users.model").User,
 *            path?: Object}} Request
 * @typedef {import("aws-lambda").APIGatewayProxyResult} Response
 */

/**
 * Create a Lambda handler function
 * @param {Function} handler - Lambda handler function
 * @param {HandlerOptions} [options={}] - options
 * @returns {Function}
 */
const createLambdaHandler = (handler, options = {}) => {
  const log = new Log();

  /**
   * Lambda handler function
   * @param {APIGatewayProxyEvent} event - HTTP request
   * @param {import("aws-lambda").Context} context - Lambda context
   * @returns {Promise<Response>}
   */
  const handlerFn = async (event, context) => {
    try {
      log.label = context.awsRequestId;

      // log request method, headers, path, and body
      log.debug(
        `${event.httpMethod} ${event.path} ${event.body} Cookie: ${event.headers.Cookie}`
      );

      const request = {}; /* @type {Request} */
      request.user = authenticateRequest(event);
      log.debug(`User ${request.user.name} authenticated`);

      if (options.validate) {
        validateRequest(event, options.validate);
      }
      if (options.bodySchema) {
        request.body = parseRequestBody(event, options.bodySchema);
        log.debug(`Request body: ${JSON.stringify(request.body)}`);
      }
      if (options.querySchema) {
        request.query = parseQueryString(event, options.querySchema);
        log.debug(`Request query: ${JSON.stringify(request.query)}`);
      }
      if (options.pathSchema) {
        request.path = parsePathParameters(event, options.pathSchema);
        log.debug(`Request path: ${JSON.stringify(request.path)}`);
      }

      const result = await handler(request);
      log.debug(`Response: ${JSON.stringify(result)}`);
      return {
        statusCode: 200,
        body: JSON.stringify(result),
      };
    } catch (error) {
      log.debug(`Error: ${error.message}`);
      if (error instanceof HttpError) {
        return {
          statusCode: error.statusCode,
          body: JSON.stringify({
            message: error.message,
            details: error.details,
          }),
        };
      } else {
        log.error(error.message);
        return {
          statusCode: 500,
          body: JSON.stringify({
            message: i18n.t("error.internalServerError"),
          }),
        };
      }
    } finally {
      log.clear();
    }
  };
  return handlerFn;
};

module.exports = {
  createLambdaHandler,
  HttpError,
};
