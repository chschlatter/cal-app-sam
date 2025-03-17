import { createError } from "@middy/util";
import { context } from "esbuild";

const defaults = {
  validatorModule: undefined,
  stringFormats: {},
};

const httpOpenapiValidator = (opts = {}) => {
  const options = { ...defaults, ...opts };

  if (!options.validatorModule) {
    throw new Error("validatorModule is required");
  }
  const { validateRequest, RequestError, ValidationError } =
    options.validatorModule;

  return {
    before: async (request) => {
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
      request.context.validationResult = validationResult;
    },
  };
};

export default httpOpenapiValidator;
