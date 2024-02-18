// @ts-check

const handlerHelper = require("../handlerHelper");
const createError = require("http-errors");
const access = require("../accessControl");
const i18n = require("../i18n");

/**
 * AWS Lambda function handler to authenticate a user
 * @param {handlerHelper.ApiEventParsed} apiEvent - HTTP request with body parsed
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>} - AWS Lambda HTTP response
 */
const auth = async (apiEvent) => {
  if (apiEvent.httpMethod !== "GET") {
    throw new createError.BadRequest(
      i18n.t("error.wrongMethod", { handler: "auth.handler", method: "GET" })
    );
  }

  const user = access.authenticate(apiEvent);

  return {
    statusCode: 200,
    body: JSON.stringify({
      name: user.name,
      role: user.role,
    }),
  };
};

exports.handler = handlerHelper.apiHandler(auth);
