"use strict";

const users = require("../users.json");
const jwt = require("jsonwebtoken");
const createError = require("http-errors");

const decodeAccessToken = (event) => {
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
    throw new createError.Unauthorized("Unauthorized");
  }

  // verify token
  try {
    return jwt.verify(accessToken, process.env.JWT_SECRET);
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      throw new createError.Unauthorized("Unauthorized");
    }
  }
};

const authenticate = (event, options = {}) => {
  const decoded = decodeAccessToken(event);
  console.log("decoded", decoded);

  // check if user exists
  if (!users[decoded.name]) {
    throw new createError.Unauthorized("Unauthorized");
  }

  // check if user has the required role
  if (options.role && options.role !== decoded.role) {
    throw new createError.Unauthorized("Unauthorized");
  }

  // check if user has the required name (only for non-admins)
  if (
    !(decoded.role == "admin") &&
    options.name &&
    options.name !== decoded.name
  ) {
    throw new createError.Unauthorized("Unauthorized");
  }

  return decoded;
};

module.exports = {
  authenticate,
};
