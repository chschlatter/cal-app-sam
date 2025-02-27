import { createError } from "@middy/util";

const defaults = {
  validatorModule: undefined,
};

const httpOpenapiValidator = (opts = {}) => {
  const { validatorModule } = { ...defaults, ...opts };

  if (!validatorModule) {
    throw new Error("validatorModule is required");
  }
  const { validateRequest, RequestError, ValidationError } = validatorModule;

  return {
    before: async (request) => {
      const { event } = request;

      const validationResult = validateRequest({
        path: event.path,
        method: event.httpMethod.toLowerCase(),
        headers: event.headers,
        query: event.queryStringParameters || {},
        body: event.body === null ? undefined : event.body,
      });

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
    },
  };
};

export default httpOpenapiValidator;
