// @ts-check

const handlerHelper = require("../handlerHelper");
const access = require("../accessControl");
const { UsersModel: Users } = require("../model/users.model");

/**
 * AWS Lambda function handler to list users from a JSON file
 * @param {handlerHelper.ApiEventParsed} apiEvent - HTTP request with body parsed
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>} - AWS Lambda HTTP response
 */
const listUsers = async (apiEvent) => {
  access.authenticate(apiEvent, { role: "admin" });

  const users = new Users().getUsers();
  const body = Object.entries(users).map(([name, user]) => {
    return {
      name: name,
      role: user.role,
      color: user.color,
    };
  });

  return {
    statusCode: 200,
    body: JSON.stringify(body),
  };
};

exports.handler = handlerHelper.apiHandler(listUsers);
