import type { JwtVariables } from "hono/jwt";
import type { AppLogger } from "../lib/logger";

export type Variables = JwtVariables & {
  logger: AppLogger;
};