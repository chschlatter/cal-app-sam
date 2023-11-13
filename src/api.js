"use strict";

// Create a DocumentClient that represents the query to add an item
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const client = new DynamoDBClient({});
exports.ddbDocClient = DynamoDBDocumentClient.from(client);

const createError = require("http-errors");
const Ajv = require("ajv/dist/jtd");

exports.apiHandler = (handler, options = {}) => {
  let parse = null;
  if (options.bodySchema) {
    const ajv = new Ajv({ allowDate: true });
    parse = ajv.compileParser(options.bodySchema);
  }

  return async (event) => {
    let response;
    try {
      // Log the request
      console.info({
        path: event.path,
        method: event.httpMethod,
        query: event.queryStringParameters,
        body: event.body,
      });

      // Parse the event body
      if (parse) {
        if (!event.body) {
          throw new createError.BadRequest("Missing request body");
        }
        event.bodyParsed = parse(event.body);
        if (event.bodyParsed === undefined) {
          console.log(parse.message);
          throw new createError.BadRequest("Invalid request body");
        }
      }

      response = await handler(event);
    } catch (err) {
      response = {
        statusCode: 500,
        body: JSON.stringify({
          message: "Internal server error",
        }),
      };

      if (createError.isHttpError(err)) {
        response = {
          statusCode: err.statusCode,
          body: JSON.stringify(err),
        };
      }

      console.log(err);
    }

    response.headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
      "Access-Control-Allow-Headers":
        "Origin,X-Requested-With,Content-Type,Accept,content-type,application/json",
    };
    return response;
  };
};
