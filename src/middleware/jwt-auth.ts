import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createError } from "@middy/util";
import jwt from "jsonwebtoken";
import { UsersModel as Users, type User } from "../model/users.model";
import type { Context as LambdaContext } from "aws-lambda";
import middy from "@middy/core";

interface JwtAuthOptions {
  secret: string;
  cookieName?: string;
  tokenSource?: (
    event: APIGatewayProxyEvent,
    cookieName: string
  ) => string | undefined;
  logger?: (message: string, error: Error) => void;
  setToContext?: boolean;
}

export type Context<TOptions extends JwtAuthOptions | undefined> =
  TOptions extends { setToContext: true }
    ? LambdaContext & {
        user: User;
      }
    : LambdaContext;

type ContextWithUser = LambdaContext & {
  user: User;
};

const parseCookies = (
  cookieString: string | undefined
): Record<string, string> => {
  if (!cookieString) {
    return {};
  }
  return cookieString
    .split(";")
    .map((cookie) => cookie.trim())
    .reduce((acc: Record<string, string>, cookie) => {
      const [name, value] = cookie.split("=");
      acc[name] = value;
      return acc;
    }, {} as Record<string, string>);
};

const defaults = {
  secret: undefined,
  cookieName: "access_token",
  tokenSource: (event: APIGatewayProxyEvent, cookieName: string) => {
    const cookies = parseCookies(event.headers.cookie);
    return cookies[cookieName];
  },
  logger: console.error,
};

const jwtAuth = <TOptions extends JwtAuthOptions>(
  opts: TOptions
): middy.MiddlewareObj<
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  any,
  Context<TOptions>
> => {
  const options: Required<JwtAuthOptions> = { ...defaults, ...opts };
  const { logger } = options;

  if (!options.secret) {
    throw new Error("secret is required");
  }

  return {
    before: async (request) => {
      try {
        const { event } = request;
        const accessToken = options.tokenSource(event, options.cookieName);
        if (!accessToken) {
          throw createError(401, "Unauthorized");
        }
        const parsedToken = jwt.verify(accessToken, options.secret);
        if (typeof parsedToken !== "string" && "name" in parsedToken) {
          const user = new Users().getUser(parsedToken.name);

          if (!user) {
            throw createError(401, "User not found");
          }
          if (options.setToContext === true) {
            (request.context as ContextWithUser).user = user;
          }
        } else {
          throw createError(401, "Invalid token");
        }
      } catch (error: any) {
        typeof logger === "function" && logger("Error during jwt-auth:", error);
        throw createError(401, "Unauthorized");
      }
    },
  };
};

export default jwtAuth;
