// @ts-check

const i18n = require("../i18n");
const { HttpError } = require("./httpError");
const { UsersModel: Users } = require("../model/users.model");
const cookieAuth = require("../cookieAuth");
const { JsonWebTokenError } = require("jsonwebtoken");

/**
 * Authenticate the request
 * @param {import("aws-lambda").APIGatewayProxyEvent} event - HTTP request
 * @returns {import("../model/users.model").User} - user
 */
export const authenticateRequest = (event) => {
  try {
    const accessTokenParsed = cookieAuth.parseSessionCookie(event);
    const users = new Users();
    const user = users.getUser(accessTokenParsed.name);
    if (!user) {
      throw new HttpError(401, i18n.t("error.unauthorized"));
    }
    return user;
  } catch (err) {
    if (err instanceof JsonWebTokenError) {
      throw new HttpError(401, i18n.t("error.unauthorized"));
    }
    throw err;
  }
};
