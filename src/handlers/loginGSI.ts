import { OAuth2Client } from "google-auth-library";
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import { UsersModel } from "../model/users.model";
import { sign } from "hono/jwt";
import { getSecret } from "../secrets";

const i18n = require("../i18n");

interface LoginGSIRequest {
  name: string;
  googleAuthJWT: string;
  stayLoggedIn?: boolean;
}

interface LoginGSIResponse {
  name: string;
  role: string;
  color: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("loginGSI: Processing Google Sign-In request");

  // Parse request body
  let body: LoginGSIRequest;
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Request body is required" }),
      };
    }
    body = JSON.parse(event.body);
  } catch (error) {
    console.error("loginGSI: Failed to parse request body", error);
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Invalid JSON in request body" }),
    };
  }

  const { name, googleAuthJWT, stayLoggedIn = false } = body;

  // Validate required fields
  if (!name || !googleAuthJWT) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "name and googleAuthJWT are required",
      }),
    };
  }

  console.log("loginGSI: Authenticating user", { username: name });

  // Validate user exists
  const usersModel = new UsersModel();
  const user = usersModel.getUser(name);
  if (!user) {
    console.warn("loginGSI: User not found", { username: name });
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: i18n.t("error.userNotFound"),
        cause: "USER_NOT_FOUND",
      }),
    };
  }

  console.log("loginGSI: User found", {
    username: user.name,
    role: user.role,
  });

  // Check if user is admin and has googleId
  if (user.role !== "admin") {
    console.warn("loginGSI: Non-admin user attempted GSI login", {
      username: name,
    });
    return {
      statusCode: 403,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Google Sign-In is only available for admin users",
      }),
    };
  }

  if (!user.googleId) {
    console.error("loginGSI: Admin user missing googleId", { username: name });
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "User configuration error: missing Google ID",
      }),
    };
  }

  // Verify Google OAuth token
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      console.error("loginGSI: GOOGLE_CLIENT_ID not configured");
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Server configuration error" }),
      };
    }

    console.log("loginGSI: Verifying Google token");
    const authClient = new OAuth2Client();
    const ticket = await authClient.verifyIdToken({
      idToken: googleAuthJWT,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      console.warn("loginGSI: No payload in Google token");
      return {
        statusCode: 403,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Failed to verify Google Auth JWT: No payload in token",
        }),
      };
    }

    // Verify the subject (user ID) matches expected
    if (payload.sub !== user.googleId) {
      console.warn("loginGSI: Google ID mismatch", {
        expected: user.googleId,
        received: payload.sub,
      });
      return {
        statusCode: 403,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Failed to verify Google Auth JWT: Google ID mismatch",
        }),
      };
    }

    console.log("loginGSI: Google token verified successfully", {
      googleId: payload.sub,
      email: payload.email,
    });
  } catch (error) {
    console.error("loginGSI: Error verifying Google token", error);
    return {
      statusCode: 403,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message:
          "Failed to verify Google Auth JWT: " +
          (error instanceof Error ? error.message : "Unknown error"),
      }),
    };
  }

  // Create JWT token
  const jwtPayload = {
    name: user.name,
    role: user.role,
    exp:
      Math.floor(Date.now() / 1000) +
      (stayLoggedIn ? 60 * 60 * 24 * 300 : 60 * 60), // 300 days or 1 hour
  };

  console.log("loginGSI: Creating JWT", {
    username: user.name,
    expiresIn: stayLoggedIn ? "300 days" : "1 hour",
  });

  const token = await sign(jwtPayload, getSecret("JWT_SECRET"));

  // Build cookie header
  const maxAge = jwtPayload.exp - Math.floor(Date.now() / 1000);
  const cookieValue = `access_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;

  console.log("loginGSI: User authenticated successfully", {
    username: user.name,
  });

  // Return response
  const responseBody: LoginGSIResponse = {
    name: user.name,
    role: user.role,
    color: user.color,
  };

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieValue,
    },
    body: JSON.stringify(responseBody),
  };
};
