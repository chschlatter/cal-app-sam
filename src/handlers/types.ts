import type { JwtVariables } from "hono/jwt";
import type { ValidateRequestResult } from "build/validator";
import type { AppLogger } from "../lib/logger";

// Specify the variable types to infer the `c.get('jwtPayload')`, `c.get('validatedData')`, and `c.get('logger')`:
export type Variables = JwtVariables & {
  validatedData: ValidateRequestResult;
  logger: AppLogger;
};