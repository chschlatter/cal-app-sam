import { MiddlewareObj } from "@middy/core";
import { type APIGatewayEvent, Context } from "aws-lambda";
// @ts-ignore: Implicitly has an 'any' type as no declaration file is available
import { ValidationError } from "../../build/validator.js";

/**
 * Extends the APIGatewayEvent type to include a parsed body.
 */
export type APIGatewayEventWithParsedBody = Omit<APIGatewayEvent, "body"> & {
  body: Record<string, unknown>;
};

/**
 * Extends the Context type to include user information.
 */
export interface ContextWithUser extends Context {
  user: {
    name: string;
    role: string;
    googleId?: string;
  };
  validationResult: {
    operationId?: string;
    params: Record<string, string>;
    query: Record<string, string | string[]>;
    body?: any;
    headers: Record<string, string>;
  };
}

/**
 * Custom string format validators.
 */
export interface StringFormats {
  date: (value: string, path: string) => ValidationError | null;
}

/**
 * Options for configuring the middlewares.
 */
export interface MiddlewareOptions {
  noAuth?: boolean;
  jsonBody?: boolean;
}

/**
 * Returns an array of Middy middlewares based on the provided options.
 * @param opts Middleware options.
 * @returns An array of Middy middleware objects.
 */
export function getMiddlewares(opts?: MiddlewareOptions): MiddlewareObj[];

/**
 * Creates an API error object.
 * @param statusCode HTTP status code.
 * @param message Error message.
 * @param cause Optional cause of the error.
 * @returns An API error object.
 */
export function createApiError(
  statusCode: number,
  message: string,
  cause?: object
): Error;
