"use strict";

const createError = require("http-errors");
const handlerHelper = require("../handlerHelper");
const users = require("../../users.json");
const createHmac = require("crypto").createHmac;
const { createSessionCookie } = require("../cookieAuth");
const { getSecret } = require("../secrets");
const i18n = require("../i18n");

const login = async (event) => {
  if (event.httpMethod !== "POST") {
    throw new createError.BadRequest(
      i18n.t("error.wrongMethod", {
        handler: "login.handler",
        method: "POST",
      })
    );
  }

  // parse body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    throw new createError.BadRequest(i18n.t("error.invalidRequestBody"));
  }

  // check if body contains name
  if (!body.name) {
    throw new createError.BadRequest(i18n.t("error.login.missingName"));
  }

  // check if user exists
  if (!users[body.name]) {
    throw new createError(400, i18n.t("error.invalidRequestBody"), {
      code: "auth-011",
    });
  }

  // check password if admin
  if (users[body.name].role == "admin") {
    if (!body.password) {
      throw new createError(400, i18n.t("error.invalidRequestBody"), {
        code: "auth-012",
      });
    }
    const hash = createHmac("sha256", getSecret("PW_HMAC_KEY"));
    hash.update(body.password);
    if (hash.digest("hex") !== users[body.name].password) {
      throw new createError(400, i18n.t("error.invalidRequestBody"), {
        code: "auth-010",
      });
    }
  }

  // create session cookie
  const cookie = createSessionCookie(
    body.name,
    users[body.name].role,
    body.stayLoggedIn ?? false
  );

  return {
    statusCode: 200,
    headers: {
      "Set-Cookie": cookie,
    },
    body: JSON.stringify({
      name: body.name,
      role: users[body.name].role,
      color: users[body.name].color,
    }),
  };
};

exports.handler = handlerHelper.apiHandler(login);
