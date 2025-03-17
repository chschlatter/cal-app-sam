// @ts-check

import middy from "@middy/core";
import { getMiddlewares, createApiError } from "../common/middyDefaults.js";

/**
 * AWS Lambda function handler to authenticate a user
 * @param {import('../common/middyDefaults.js').APIGatewayEventWithParsedBody} event
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>}
 */
const authHandler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      name: context.user.name,
      role: context.user.role,
    }),
  };
};

export const handler = middy()
  .use(getMiddlewares({ jsonBody: false }))
  .handler(authHandler);
