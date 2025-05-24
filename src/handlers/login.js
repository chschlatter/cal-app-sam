import { UsersModel as Users } from "../model/users.model";
import { createSessionCookie } from "../cookieAuth";
import { getSecret } from "../secrets";
import i18n from "../i18n";
import { OAuth2Client } from "google-auth-library";
const authClient = new OAuth2Client();

import middy from "@middy/core";
import { getMiddlewares, createApiError } from "../common/middyDefaults.js";

/**
 * AWS Lambda function handler to login a user and create a session cookie
 * @param {import('../common/middyDefaults.js').APIGatewayEventWithParsedBody} event
 * @returns {Promise<import("aws-lambda").APIGatewayProxyResult>}
 */
const loginHandler = async (event) => {
  const { name, stayLoggedIn, googleAuthJWT } = event.body;
  const user = new Users().getUser(name);

  // check if user exists
  if (!user) {
    throw createApiError(400, i18n.t("error.userNotFound"), {
      code: "auth-001",
    });
  }

  // check google auth if admin
  if (user.role == "admin") {
    if (googleAuthJWT) {
      try {
        const ticket = await authClient.verifyIdToken({
          idToken: googleAuthJWT,
          audience: getSecret("GOOGLE_CLIENT_ID"),
        });
        const payload = ticket.getPayload();
        if (payload !== undefined) {
          if (payload.sub !== user.googleId) {
            throw createApiError(403, i18n.t("error.unauthorized"), {
              code: "auth-013",
            });
          }
        }
      } catch (error) {
        throw createApiError(400, i18n.t("error.invalidRequestBody"), {
          code: "auth-014",
        });
      }
    } else {
      throw createApiError(406, i18n.t("error.missingGoogleAuth"));
    }
  }

  // create session cookie
  const cookie = createSessionCookie(name, user.role, stayLoggedIn ?? false);

  return {
    statusCode: 200,
    headers: {
      "Set-Cookie": cookie,
    },
    body: JSON.stringify({
      name: name,
      role: user.role,
      color: user.color,
    }),
  };
};

export const handler = middy()
  .use(getMiddlewares({ jsonBody: true, noAuth: true }))
  .handler(loginHandler);
