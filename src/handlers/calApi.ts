import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { logger as honoLogger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { handle } from "hono/aws-lambda";
import { StatusCode } from "hono/utils/http-status";
import type { Variables } from "./types";
import { getSecret } from "../secrets";
import { logger, honoPrintFunc } from "../lib/logger";

// Import route modules
import indexPageRoutes from "./routes/indexPage";
import eventsRoutes from "./routes/events";
import loginRoutes from "./routes/login";
import eventFormRoutes from "./routes/eventForm";

// Import pricing service and data
import prices from "../../prices.json";
import { PricingService } from "../lib/pricing";

// Initialize pricing service once at Lambda cold start
PricingService.initialize(prices);

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

  // JWT middleware for / and /api2/* routes except /login
  .use("*", async (c, next) => {
    logger.debug("JWT Middleware: Checking path", { path: c.req.path });

    // Skip JWT for /login
    if (
      c.req.path === "/login" ||
      c.req.path.startsWith("/login/form")
    )
      return next();

    // Apply JWT middleware for / and /api2/* routes
    if (c.req.path === "/" || c.req.path.startsWith("/api2/")) {
      try {
        console.debug("Hono request:", c.req);
        console.debug("JWT_SECRET:", getSecret("JWT_SECRET"));
        return await jwt({
          cookie: "access_token",
          secret: getSecret("JWT_SECRET"),
          alg: "HS256",
        })(c, next);
      } catch (error) {
        // If JWT validation fails on /, redirect to /login
        if (c.req.path === "/") {
          return c.redirect("/login");
        }
        // For API routes, let the default JWT error handling occur (401)
        throw error;
      }
    }

    return next();
  })

  // Mount route modules
  .route("/", indexPageRoutes)
  .route("/login", loginRoutes)
  .route("/api2/events", eventsRoutes)
  .route("/api2/event/form", eventFormRoutes);

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
