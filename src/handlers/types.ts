import type { JwtVariables } from "hono/jwt";
import type { ValidateRequestResult } from "build/validator";

// Specify the variable types to infer the `c.get('jwtPayload')` and `c.get('validatedData')`:
export type Variables = JwtVariables & {
  validatedData: ValidateRequestResult;
};