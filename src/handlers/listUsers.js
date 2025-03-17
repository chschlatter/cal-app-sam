// @ts-check

const { UsersModel: Users } = require("../model/users.model");

import middy from "@middy/core";
import { getMiddlewares, createApiError } from "../common/middyDefaults.js";

/**
 * AWS Lambda function handler to list users from a JSON file
 * @param {import('../common/middyDefaults.js').APIGatewayEventWithParsedBody} event
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>} - AWS Lambda HTTP response
 */
const listUserHandler = async (event) => {
  const users = new Users().getUsers();
  return {
    statusCode: 200,
    body: JSON.stringify(users),
  };
};

export const handler = middy()
  .use(getMiddlewares({ jsonBody: false }))
  .handler(listUserHandler);
