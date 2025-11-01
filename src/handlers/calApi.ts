import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { HTTPException } from "hono/http-exception";
import { handle } from "hono/aws-lambda";
import { StatusCode } from "hono/utils/http-status";
import { openApiStaticValidator } from "../middleware/openapi-static-validator";
import type { Variables } from "./types";
import { getSecret } from "../secrets";

// Import route modules
import eventsRoutes from "./routes/events";
import loginRoutes from "./routes/login";
import usersRoutes from "./routes/users";
import authRoutes from "./routes/auth";
import pricesRoutes from "./routes/prices";

const app = new Hono<{ Variables: Variables }>();

app
  // JWT middleware for all /api2/* routes except /api2/login (runs BEFORE validator)
  .use("/api2/*", async (c, next) => {
    if (c.req.path === "/api2/login") return next();
    return jwt({
      cookie: "access_token",
      secret: getSecret("JWT_SECRET"),
    })(c, next);
  })

  // OpenAPI static validator middleware for all routes
  .use("*", openApiStaticValidator)

  // Mount route modules
  .route("/api2/events", eventsRoutes)
  .route("/api2/login", loginRoutes)
  .route("/api2/users", usersRoutes)
  .route("/api2/auth", authRoutes)
  .route("/api2/prices", pricesRoutes);

app.onError((err, c) => {
  const errorResponse = {
    status: 500 as StatusCode,
    body: {
      message: "Unknown error",
      cause: {},
    },
  };

  if (err instanceof HTTPException) {
    errorResponse.status = err.status;
    errorResponse.body.message = err.message;
    if (err.cause && typeof err.cause === "object") {
      errorResponse.body.cause = err.cause;
    }
    // Debug logging
    console.log("Error response:", JSON.stringify(errorResponse.body));
  } else if (err instanceof Error) {
    console.error("Unhandled error:", err);
    if (err && err.stack) {
      console.error("Stack trace:", err.stack);
    }
    errorResponse.body.message = "Internal server error";
  }

  c.status(errorResponse.status);
  return c.json(errorResponse.body);
});

export const handler = handle(app);
