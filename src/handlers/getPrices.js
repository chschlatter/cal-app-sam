// @ts-check

const handlerHelper = require("../handlerHelper");
const prices = require("../../prices.json");
const access = require("../accessControl");

/**
 * AWS Lambda function handler to get prices from a JSON file
 * @param {handlerHelper.ApiEventParsed} apiEvent - HTTP request with body parsed
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>} - AWS Lambda HTTP response
 */
const getPrices = async (apiEvent) => {
  access.authenticate(apiEvent);

  return {
    statusCode: 200,
    body: JSON.stringify(prices),
  };
};

exports.handler = handlerHelper.apiHandler(getPrices);
