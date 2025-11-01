import { Hono } from "hono";
import type { Variables } from "../types";
import { HTTPException } from "hono/http-exception";
import { UsersModel as Users } from "../../model/users.model";
import i18n from "../../i18n";

const app = new Hono<{ Variables: Variables }>();

app.get("/", async (c) => {
  const jwtPayload = c.get("jwtPayload");

  // Only admin can list users
  if (jwtPayload.role !== "admin") {
    throw new HTTPException(403, {
      message: i18n.t("error.unauthorized"),
    });
  }

  const users = new Users().getUsers();
  const body = Object.entries(users).map(([name, user]) => {
    return {
      name: name,
      role: user.role,
      color: user.color,
    };
  });

  return c.json(body);
});

export default app;