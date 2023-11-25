"use strict";

const createError = require("http-errors");
// const users = require("../../users.json");
const jwt = require("jsonwebtoken");
console.log("process.env.JWT_SECRET", process.env.JWT_SECRET);

exports.handler = async (event) => {
  let response;
  try {
    if (event.httpMethod !== "GET") {
      throw new createError.BadRequest("auth.handler only accepts GET method");
    }

    // get access_token from cookie
    const cookieHeader = event.headers["Cookie"];
    if (!cookieHeader) {
      throw new createError.Unauthorized("Unauthorized");
    }
    const cookies = cookieHeader.split("; ");
    let accessToken;
    for (const cookie of cookies) {
      const [name, value] = cookie.split("=");
      if (name === "access_token") {
        accessToken = value;
      }
    }
    if (!accessToken) {
      // unauthorized
      throw new createError(401, "Unauthorized", { code: "auth-020" });
    }

    // verify token
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    response = {
      statusCode: 200,
      body: JSON.stringify({
        name: decoded.name,
        role: decoded.role,
      }),
    };
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

    if (err instanceof jwt.JsonWebTokenError) {
      response = {
        statusCode: 401,
        body: JSON.stringify({
          message: "Unauthorized",
          code: "auth-020",
        }),
      };
    }

    console.log(err);
  }
  /*
  response.headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true,
    "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Origin,X-Requested-With,Content-Type,Accept,content-type,application/json",
  };
  */
  return response;
};
