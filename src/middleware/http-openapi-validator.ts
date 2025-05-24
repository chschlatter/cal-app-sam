import type {
  validateRequest,
  ValidateRequestResult,
  RequestError,
  ValidationError,
} from "./http-openapi-validator-types";
import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createError } from "@middy/util";
import type { Context as LambdaContext } from "aws-lambda";

interface HttpOpenapiValidatorOptions {
  validatorModule:
    | {
        validateRequest: typeof validateRequest;
        RequestError: typeof RequestError;
        ValidationError: typeof ValidationError;
      }
    | undefined;
  stringFormats?: {
    [format: string]: (
      value: string,
      path: string[]
    ) => ValidationError | string | null;
  };
  setToContext?: boolean;
}

export type Context<TOptions extends HttpOpenapiValidatorOptions | undefined> =
  TOptions extends { setToContext: true }
    ? LambdaContext & {
        validationResult: ValidateRequestResult;
      }
    : LambdaContext;

type ContextWithValidationResult = LambdaContext & {
  validationResult: ValidateRequestResult;
};

const defaults: HttpOpenapiValidatorOptions = {
  validatorModule: undefined,
  stringFormats: {},
  setToContext: true,
};

const httpOpenapiValidator = <TOptions extends HttpOpenapiValidatorOptions>(
  opts: TOptions
): middy.MiddlewareObj<
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  any,
  Context<TOptions>
> => {
  const options: TOptions = { ...defaults, ...opts };

  if (!options.validatorModule) {
    throw new Error("validatorModule is required");
  }
  const { validateRequest, RequestError, ValidationError } =
    options.validatorModule;

  return {
    before: async (
      request: middy.Request<any, any, Error, Context<TOptions>>
    ): Promise<void> => {
      const { event } = request;

      const validationResult = validateRequest(
        {
          path: event.path,
          method: event.httpMethod.toLowerCase(),
          headers: event.headers,
          query: event.queryStringParameters || {},
          body: event.body === null ? undefined : event.body,
        },
        {
          stringFormats: options.stringFormats,
        }
      );

      if (validationResult instanceof RequestError) {
        if (validationResult instanceof ValidationError) {
          const paramName =
            validationResult.path[0] +
            " parameter [" +
            validationResult.path[1] +
            "]";
          const errorMsg = `Failed to validate ${paramName}`;
          throw createError(400, errorMsg, {
            cause: {
              package: "http-openapi-validator",
              type: "ValidationError",
              code: validationResult.code,
              path: validationResult.path,
              error: validationResult.message,
            },
          });
        }
        throw createError(400, validationResult.message, {
          cause: {
            package: "http-openapi-validator",
            type: "RequestError",
            code: validationResult.code,
          },
        });
      }
      if (options.setToContext === true) {
        // type guard needed, becaues ts does not infer the type of request.context (conditional type)
        (request.context as ContextWithValidationResult).validationResult =
          validationResult;
      }
    },
  };
};

export default httpOpenapiValidator;
