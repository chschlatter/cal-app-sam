import { createError } from "@middy/util";
import jwt from "jsonwebtoken";

const { UsersModel: Users } = require("../model/users.model");

const parseCookies = (cookieString) => {
  return cookieString
    .split(";")
    .map((cookie) => cookie.trim())
    .reduce((acc, cookie) => {
      const [name, value] = cookie.split("=");
      acc[name] = value;
      return acc;
    }, {});
};

const defaults = {
  secret: undefined,
  cookieName: "access_token",
  tokenSource: (event, cookieName) => {
    const cookies = parseCookies(event.headers.cookie);
    return cookies[cookieName];
  },
  logger: console.error,
};

const jwtAuth = (opts = {}) => {
  const options = { ...defaults, ...opts };
  const { logger } = options;

  if (!options.secret) {
    throw new Error("secret is required");
  }

  return {
    before: async (request) => {
      try {
        const { event } = request;
        const accessToken = options.tokenSource(event, options.cookieName);
        const parsedToken = jwt.verify(accessToken, options.secret);
        const user = new Users().getUser(parsedToken.name);
        if (!user) {
          throw createError(401, undefined);
        }
        request.context.user = user;
      } catch (error) {
        typeof logger === "function" && logger("Error during jwt-auth:", error);
        throw createError(401, undefined);
      }
    },
  };
};

export default jwtAuth;
