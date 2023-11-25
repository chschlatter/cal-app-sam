"use strict";

const createError = require("http-errors");
const users = require("../../users.json");

exports.handler = async (event) => {
  /*
  const userNames = Object.keys(users);
  const response = {
    statusCode: 200,
    body: JSON.stringify(userNames),
  };
  */

  let response;
  try {
    if (event.httpMethod !== "GET") {
      throw new createError.BadRequest(
        "listUser.handler only accepts GET method"
      );
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
    response = {
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
