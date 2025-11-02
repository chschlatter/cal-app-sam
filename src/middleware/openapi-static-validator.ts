import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import {
  validateRequest,
  RequestError,
  ValidationError,
  type ValidateRequestResult,
} from "build/validator";
import isDate from "validator/es/lib/isDate";
import type { Variables } from "../handlers/types";

const jsonRegex =
  /^application\/([a-z-\.]+\+)?json(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/;
const simpleDateRegex = /^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/;

const stringFormats = {
  date: (value: string, path: string[]) =>
    isDate(value, { format: "YYYY-MM-DD", strictMode: true })
      ? null
      : new ValidationError(path, "Invalid date"),
};

export const openApiStaticValidator = createMiddleware<{
  Variables: Variables;
}>(async (c, next) => {
  const logger = c.get("logger");
  let body = undefined;
  const contentType = c.req.header("Content-Type");
  const contentLength = c.req.header("Content-Length");

  // Only try to parse JSON if Content-Type is JSON and there's actually content
  if (contentType && jsonRegex.test(contentType) && contentLength !== "0") {
    try {
      const text = await c.req.text();
      if (text && text.trim().length > 0) {
        body = JSON.parse(text);
      }
    } catch (e) {
      logger.error("Failed to parse JSON body", {
        error: e instanceof Error ? e.message : String(e),
      });
      const message = "Invalid JSON body";
      throw new HTTPException(400, {
        message,
      });
    }
  }

  const query = Object.fromEntries(
    Object.entries(c.req.queries()).map(([k, v]) => {
      return v.length === 1 ? [k, v[0]] : [k, v];
    })
  );

  // Debug logging for date parameters
  if (query.start) {
    logger.debug("Query param 'start'", { value: query.start, type: typeof query.start });
  }
  if (query.end) {
    logger.debug("Query param 'end'", { value: query.end, type: typeof query.end });
  }

  const validatedData = validateRequest(
    {
      method: c.req.method.toLowerCase(),
      path: c.req.path,
      body,
      query,
      headers: c.req.header(),
    },
    {
      stringFormats,
    }
  );

  if (validatedData instanceof RequestError) {
    if (validatedData instanceof ValidationError) {
      const paramName =
        validatedData.path[0] + " parameter [" + validatedData.path[1] + "]";
      const errorMsg = `Failed to validate ${paramName}`;
      throw new HTTPException(400, {
        message: errorMsg,
        cause: {
          package: "http-openapi-validator",
          type: "ValidationError",
          code: validatedData.code,
          path: validatedData.path,
          error: validatedData.message,
        },
      });
    }

    throw new HTTPException(400, {
      message: validatedData.message,
      cause: {
        package: "http-openapi-validator",
        type: "RequestError",
        code: validatedData.code,
      },
    });
  }

  c.set("validatedData", validatedData);
  await next();
});
