"use strict";

const handlerHelper = require("../handlerHelper");
const createError = require("http-errors");
const access = require("../accessControl");

const auth = async (event) => {
  return authHandler(event);
};

exports.handler = handlerHelper.apiHandler(auth);

const authHandler = async (event) => {
  if (event.httpMethod !== "GET") {
    throw new createError.BadRequest("auth.handler only accepts GET method");
  }

  const user = access.authenticate(event);

  return {
    statusCode: 200,
    body: JSON.stringify({
      name: user.name,
      role: user.role,
    }),
  };
};
