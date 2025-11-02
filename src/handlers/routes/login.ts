import { Hono } from "hono";
import type { Variables } from "../types";
import { HTTPException } from "hono/http-exception";
import { UsersModel as Users } from "../../model/users.model";
import { getSecret } from "../../secrets";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { sign } from "hono/jwt";
import { setCookie } from "hono/cookie";

const i18n = require("../../i18n");

// Initialize Lambda client during cold start
const lambdaClient = new LambdaClient({});

const app = new Hono<{ Variables: Variables }>();

app.post("/", async (c) => {
  const logger = c.get("logger");
  const validatedBody = c.get("validatedData").body;
  logger.debug("Login request", { username: validatedBody.name });

  const { name, stayLoggedIn, googleAuthJWT } = validatedBody; // stayLoggedIn and googleAuthJWT are optional
  const user = new Users().getUser(name);
  if (!user) {
    // Return 400 with cause "USER_NOT_FOUND" as expected by frontend (calLogin.js)
    throw new HTTPException(400, {
      message: i18n.t("error.userNotFound"),
      cause: "USER_NOT_FOUND",
    });
  }
  logger.debug("User found", { username: user.name, role: user.role });

  // Admin users must authenticate with Google OAuth
  if (user.role === "admin") {
    if (!googleAuthJWT) {
      throw new HTTPException(406, {
        message: "Admin users must provide a Google Auth JWT",
      });
    }

    // Invoke the verifyGoogleToken Lambda function
    try {
      const command = new InvokeCommand({
        FunctionName: process.env.VERIFY_GOOGLE_TOKEN_FUNCTION,
        Payload: JSON.stringify({
          googleAuthJWT,
          googleClientId: process.env.GOOGLE_CLIENT_ID,
          expectedGoogleId: user.googleId,
        }),
      });

      const response = await lambdaClient.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.Payload));

      if (!result.verified) {
        throw new HTTPException(403, {
          message: result.error || "Not authorized to login as admin",
        });
      }
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      logger.error("Error verifying Google token", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new HTTPException(403, {
        message: "Failed to verify Google Auth JWT",
      });
    }
  }

  const jwtPayload = {
    name: user.name,
    role: user.role,
    exp:
      Math.floor(Date.now() / 1000) +
      (stayLoggedIn ? 60 * 60 * 24 * 300 : 60 * 60), // 300 days or 1 hour
  };
  logger.debug("JWT created", { username: user.name, expiresIn: stayLoggedIn ? "300 days" : "1 hour" });
  const token = await sign(jwtPayload, getSecret("JWT_SECRET"));
  setCookie(c, "access_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    path: "/", // Set to root so cookie works for both /api and /api2
    maxAge: jwtPayload.exp - Math.floor(Date.now() / 1000), // Set maxAge based on exp
  });

  return c.json({
    name: user.name,
    role: user.role,
    color: user.color,
  });
});

export default app;