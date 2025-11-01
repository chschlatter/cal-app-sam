export function validateRequest(
  request: ValidateRequestParams,
  context?: ValidateRequestContext
): ValidateRequestResult | RequestError | ValidationError;

export interface ValidateRequestParams {
  method: string;
  path: string;
  body?: any;
  query: Record<string, string | string[]>;
  headers: Record<string, string>;
}

export interface ValidateRequestContext {
  stringFormats?: {
    [format: string]: (
      value: string,
      path: string[]
    ) => ValidationError | string | null;
  };
}

export interface ValidateRequestResult {
  operationId?: string;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  body?: any;
  headers: Record<string, string>;
}

export class RequestError extends Error {
  code: number;
  constructor(code: number, message: string);
}

export class ValidationError extends RequestError {
  path: string[];
  constructor(path: string[], message: string);
}
