import { Hono } from "hono";
import type { Variables } from "../types";

const app = new Hono<{ Variables: Variables }>();

app.get("/", async (c) => {
  const jwtPayload = c.get("jwtPayload");

  // Return authenticated user info
  return c.json({
    name: jwtPayload.name,
    role: jwtPayload.role,
  });
});

export default app;