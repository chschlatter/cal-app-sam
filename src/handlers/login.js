"use strict";

const createError = require("http-errors");
const handlerHelper = require("../handlerHelper");
const users = require("../../users.json");
const jwt = require("jsonwebtoken");
const createHmac = require("crypto").createHmac;

const login = async (event) => {
  if (event.httpMethod !== "POST") {
    throw new createError.BadRequest("login.handler only accepts POST method");
  }

  // parse body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    throw new createError.BadRequest("Invalid request body");
  }

  // check if body contains name
  if (!body?.name) {
    throw new createError.BadRequest("Missing login name");
  }

  // check if user exists
  if (!users[body.name]) {
    throw new createError(400, "Invalid request body", { code: "auth-011" });
  }

  // check password if admin
  if (users[body.name].role == "admin") {
    if (!body.password) {
      throw new createError(400, "Invalid request body", {
        code: "auth-012",
      });
    }
    const hash = createHmac("sha256", process.env.PW_HMAC_KEY);
    hash.update(body.password);
    if (hash.digest("hex") !== users[body.name].password) {
      throw new createError(400, "Invalid request body", {
        code: "auth-010",
      });
    }
  }

  // create token
  const token = jwt.sign(
    {
      name: body.name,
      role: users[body.name].role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  // add token as cookie
  return {
    statusCode: 200,
    headers: {
      "Set-Cookie": `access_token=${token}; HttpOnly; Secure; SameSite=Strict`,
    },
    body: JSON.stringify({
      name: body.name,
      role: users[body.name].role,
      color: users[body.name].color,
    }),
  };
};

exports.handler = handlerHelper.apiHandler(login);
