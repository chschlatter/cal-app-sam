import { Hono } from "hono";
import type { Variables } from "../types";
import { HTTPException } from "hono/http-exception";
import {
  EventsModelNoLock,
  EventsError,
  type Event,
} from "../../model/events.model-DynNoLock";
import { UsersModel as Users } from "../../model/users.model";
import i18n from "../../i18n";

// Initialize the events model during cold start
const events = new EventsModelNoLock();

const app = new Hono<{ Variables: Variables }>();

app.get("/", async (c) => {
  const logger = c.get("logger");
  const validatedQuery = c.get("validatedData").query;
  const result = await events.list(
    Array.isArray(validatedQuery.start)
      ? validatedQuery.start[0]
      : validatedQuery.start,
    Array.isArray(validatedQuery.end)
      ? validatedQuery.end[0]
      : validatedQuery.end
  );

  // Add colors to events based on user
  const users = new Users();
  const eventsWithColors = result.map((event) => {
    event.color = users.getUserColor(event.title);
    return event;
  });

  logger.debug("List events", { count: eventsWithColors.length });
  return c.json(eventsWithColors);
});

app.post("/", async (c) => {
  const validatedBody = c.get("validatedData").body;
  const jwtPayload = c.get("jwtPayload");

  const newEvent: Event = {
    id: "",
    ...validatedBody,
  };

  // Authorize user - only admin can create events for other users
  if (jwtPayload.role !== "admin") {
    if (jwtPayload.name !== newEvent.title) {
      throw new HTTPException(403, {
        message: i18n.t("error.unauthorized"),
      });
    }
  }

  try {
    const createdEvent = await events.create(newEvent);
    createdEvent.color = new Users().getUserColor(createdEvent.title);
    return c.json(createdEvent, 201);
  } catch (err) {
    if (err instanceof EventsError) {
      switch (err.code) {
        case "start_end_required":
          throw new HTTPException(400, {
            message: i18n.t("error.listEvents.startEnd"),
          });
        case "event_not_found":
          throw new HTTPException(400, {
            message: i18n.t("error.eventNotFound"),
          });
        case "event_overlaps":
          throw new HTTPException(409, {
            message: i18n.t("error.eventOverlaps"),
            cause: err.data,
          });
        case "event_max_days":
          throw new HTTPException(400, {
            message: i18n.t("error.eventMaxDays", {
              maxDays: err.data?.maxDays,
            }),
            cause: err.data,
          });
        case "event_min_days":
          throw new HTTPException(400, {
            message: i18n.t("error.eventMinDays", {
              minDays: err.data?.minDays,
            }),
            cause: err.data,
          });
        case "event_validation":
          throw new HTTPException(400, {
            message: i18n.t("error.eventValidation"),
            cause: err.data,
          });
        default:
          throw new HTTPException(500, {
            message: i18n.t("error.unknownEventError", {
              message: err.message,
            }),
          });
      }
    } else {
      throw err;
    }
  }
});

app.put("/:id", async (c) => {
  const validatedBody = c.get("validatedData").body;
  const jwtPayload = c.get("jwtPayload");
  const eventId = c.req.param("id");

  if (!eventId) {
    throw new HTTPException(400, {
      message: i18n.t("error.missingIdinPath"),
    });
  }

  try {
    const eventFromDb = await events.get(eventId);

    // Check if body id matches path id
    if (validatedBody.id !== eventId) {
      throw new HTTPException(400, {
        message: i18n.t("error.idMismatch"),
      });
    }

    // Authorize user - only admin can update other users' events
    if (jwtPayload.role !== "admin") {
      if (
        jwtPayload.name !== eventFromDb.title ||
        jwtPayload.name !== validatedBody.title
      ) {
        throw new HTTPException(403, {
          message: i18n.t("error.unauthorized"),
        });
      }
    }

    const updatedEvent = await events.update(eventFromDb, validatedBody);
    updatedEvent.color = new Users().getUserColor(updatedEvent.title);
    return c.json(updatedEvent);
  } catch (err) {
    if (err instanceof EventsError) {
      switch (err.code) {
        case "start_end_required":
          throw new HTTPException(400, {
            message: i18n.t("error.listEvents.startEnd"),
          });
        case "event_not_found":
          throw new HTTPException(400, {
            message: i18n.t("error.eventNotFound"),
          });
        case "event_overlaps":
          throw new HTTPException(409, {
            message: i18n.t("error.eventOverlaps"),
            cause: err.data,
          });
        case "event_max_days":
          throw new HTTPException(400, {
            message: i18n.t("error.eventMaxDays", {
              maxDays: err.data?.maxDays,
            }),
            cause: err.data,
          });
        case "event_min_days":
          throw new HTTPException(400, {
            message: i18n.t("error.eventMinDays", {
              minDays: err.data?.minDays,
            }),
            cause: err.data,
          });
        case "event_validation":
          throw new HTTPException(400, {
            message: i18n.t("error.eventValidation"),
            cause: err.data,
          });
        case "event_updated":
          throw new HTTPException(409, {
            message: i18n.t("error.eventUpdated"),
          });
        default:
          throw new HTTPException(500, {
            message: i18n.t("error.unknownEventError", {
              message: err.message,
            }),
          });
      }
    }
    throw err;
  }
});

app.delete("/:id", async (c) => {
  const jwtPayload = c.get("jwtPayload");
  const eventId = c.req.param("id");

  if (!eventId) {
    throw new HTTPException(400, {
      message: i18n.t("error.missingIdinPath"),
    });
  }

  try {
    // Get event from database
    const eventFromDb = await events.get(eventId);

    // Authorize user - only admin can delete other users' events
    if (jwtPayload.role !== "admin" && jwtPayload.name !== eventFromDb.title) {
      throw new HTTPException(403, {
        message: i18n.t("error.unauthorized"),
      });
    }

    await events.remove(eventFromDb);

    return c.json({ message: "Event deleted" });
  } catch (err) {
    if (err instanceof EventsError) {
      switch (err.code) {
        case "event_not_found":
          throw new HTTPException(400, {
            message: i18n.t("error.eventNotFound"),
          });
        case "event_updated":
          throw new HTTPException(409, {
            message: i18n.t("error.eventUpdated"),
          });
        default:
          throw new HTTPException(500, {
            message: i18n.t("error.unknownEventError", {
              message: err.message,
            }),
          });
      }
    }
    throw err;
  }
});

export default app;