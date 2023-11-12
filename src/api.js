"use strict";

const createError = require("http-errors");

exports.apiHandler = (handler) => {
  return async (event) => {
    try {
      console.info(event);
      let response = await handler(event);
      response.headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      };
      return response;
    } catch (err) {
      let response = {
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
      return response;
    }
  };
};
