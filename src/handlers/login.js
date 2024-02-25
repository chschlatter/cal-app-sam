// @ts-check

const createError = require("http-errors");
const handlerHelper = require("../handlerHelper");
const { users } = require("../accessControl");
const { createSessionCookie } = require("../cookieAuth");
const { getSecret } = require("../secrets");
const i18n = require("../i18n");

const { OAuth2Client } = require("google-auth-library");
const authClient = new OAuth2Client();

/**
 * body schema for the POST request
 * @type {import("../handlerHelper").BodySchema}
 */
const bodySchema = {
  name: { type: "string", required: true },
  stayLoggedIn: { type: "boolean", required: false },
  googleAuthJWT: { type: "string", required: false },
};

/**
 * @typedef {Object} httpBody
 * @property {string} name
 * @property {boolean} [stayLoggedIn]
 * @property {string} [googleAuthJWT]
 */

/**
 * AWS Lambda function handler to login a user and create a session cookie
 * @param {handlerHelper.ApiEventParsed} apiEvent - HTTP request with body parsed
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>} - AWS Lambda HTTP response
 */
const login = async (apiEvent) => {
  if (apiEvent.httpMethod !== "POST") {
    throw new createError.BadRequest(
      i18n.t("error.wrongMethod", {
        handler: "login.handler",
        method: "POST",
      })
    );
  }

  // parse body
  /** @type {httpBody} */
  const body = apiEvent.bodyParsed;

  // check if user exists
  if (!users[body.name]) {
    throw new createError.NotFound(i18n.t("error.userNotFound"));
  }

  // check google auth if admin
  if (users[body.name].role == "admin") {
    if (body.googleAuthJWT) {
      try {
        const ticket = await authClient.verifyIdToken({
          idToken: body.googleAuthJWT,
          audience: getSecret("GOOGLE_CLIENT_ID"),
        });
        const payload = ticket.getPayload();
        if (payload !== undefined) {
          if (payload.sub !== users[body.name].googleId) {
            throw new createError.Unauthorized(i18n.t("error.unauthorized"));
          }
        }
      } catch (error) {
        throw createError(400, i18n.t("error.invalidRequestBody"), {
          code: "auth-014",
        });
      }
    } else {
      throw new createError.NotAcceptable(i18n.t("error.missingGoogleAuth"));
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

exports.handler = handlerHelper.apiHandler(login, {
  bodySchema: bodySchema,
});
