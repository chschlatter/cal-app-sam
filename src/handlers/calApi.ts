import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { logger as honoLogger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { handle } from "hono/aws-lambda";
import { StatusCode } from "hono/utils/http-status";
import { openApiStaticValidator } from "../middleware/openapi-static-validator";
import type { Variables } from "./types";
import { getSecret } from "../secrets";
import { logger, honoPrintFunc } from "../lib/logger";

// Import route modules
import eventsRoutes from "./routes/events";
import loginRoutes from "./routes/login";
import usersRoutes from "./routes/users";
import authRoutes from "./routes/auth";
import pricesRoutes from "./routes/prices";

const app = new Hono<{ Variables: Variables }>();

app
  // Hono logger with custom PrintFunc (routes through lesslog)
  .use("*", honoLogger(honoPrintFunc))

  // Make logger available to all routes
  .use("*", async (c, next) => {
    c.set("logger", logger);
    await next();
    logger.clear();
  })

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

// Clear accumulated logs on successful requests
/*
  .use("*", async (c, next) => {
    await next();
    logger.clear();
  });
*/

app.onError((err, c) => {
  const errorResponse = {
    status: 500 as StatusCode,
    body: {
      message: "Unknown error",
      cause: undefined as string | object | null | undefined,
    },
  };

  if (err instanceof HTTPException) {
    errorResponse.status = err.status;
    errorResponse.body.message = err.message;
    if (err.cause !== undefined && err.cause !== null) {
      errorResponse.body.cause = err.cause;
    }
    // Log error details
    logger.error("HTTP exception", {
      status: errorResponse.status,
      message: errorResponse.body.message,
      cause: errorResponse.body.cause,
    });
  } else if (err instanceof Error) {
    logger.error("Unhandled error", {
      message: err.message,
      stack: err.stack,
    });
    errorResponse.body.message = "Internal server error";
  }

  // Flush all accumulated logs (including debug) on error
  logger.flush();

  c.status(errorResponse.status);
  return c.json(errorResponse.body);
});

export const handler = handle(app);
