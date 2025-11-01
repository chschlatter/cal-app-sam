import { Hono } from "hono";
import type { Variables } from "../types";
import prices from "../../../prices.json";

const app = new Hono<{ Variables: Variables }>();

app.get("/", async (c) => {
  // User is already authenticated by JWT middleware
  return c.json(prices);
});

export default app;