// @ts-check

const prices = require("../../prices.json");

import middy from "@middy/core";
import { getMiddlewares, createApiError } from "../common/middyDefaults.js";

/**
 * AWS Lambda function handler to get prices from a JSON file
 * @param {import('../common/middyDefaults.js').APIGatewayEventWithParsedBody} event
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>}
 */
const getPricesHandler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify(prices),
  };
};

export const handler = middy()
  .use(getMiddlewares({ jsonBody: false }))
  .handler(getPricesHandler);
