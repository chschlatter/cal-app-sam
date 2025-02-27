import { createError } from "@middy/util";

export const httpErrorJsonFormatter = () => {
  return {
    onError: (request) => {
      const { error } = request;
      const responseBodyObject = {
        message: error.message,
      };
      if (error.cause) {
        responseBodyObject.details = error.cause;
      }
      request.response.body = JSON.stringify(responseBodyObject);
    },
  };
};

export const createApiError = (statusCode, message, cause = {}) => {
  const error = createError(statusCode, message);
  error.cause = cause;
  return error;
};

export default httpErrorJsonFormatter;
