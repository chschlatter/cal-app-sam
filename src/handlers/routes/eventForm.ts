import { Hono } from "hono";
import * as v from "valibot";
import { sValidator } from "@hono/standard-validator";
import type { Variables } from "../types";
import { UsersModel as Users } from "../../model/users.model";
import {
  EventsModelNoLock,
  EventsError,
} from "../../model/events.model-DynNoLock";
import i18n from "../../i18n";
import dayjs from "dayjs";
import { PricingService } from "../../lib/pricing";
import { s } from "@fullcalendar/core/internal-common";

const app = new Hono<{ Variables: Variables }>();

// Shared template function
function renderEventForm(data: {
  id?: string;
  start?: string;
  end?: string;
  title?: string;
  mode?: string;
  errorMessage?: string;
  isAdmin?: boolean;
}) {
  const { id, start, end, title, mode, errorMessage, isAdmin } = data;
  const isEdit = mode === "edit" || !!id;

  // Calculate users list if admin
  let users: Array<{ name: string; role: string; color: string }> = [];
  if (isAdmin) {
    const usersModel = new Users();
    const usersData = usersModel.getUsers();
    users = Object.entries(usersData).map(([name, user]) => ({
      name,
      role: user.role,
      color: user.color,
    }));
  }

  // Calculate initial price if both dates are provided
  let initialPrice = "";
  if (start && end) {
    try {
      const pricingService = PricingService.getInstance();
      initialPrice = pricingService.getPriceString(start, end);
    } catch (error) {
      // If pricing service not initialized or calculation fails, leave empty
      initialPrice = "";
    }
  }

  return /* HTML */ `
    <div class="modal-header">
      <h5 class="modal-title">
        ${isEdit ? "Reservation bearbeiten" : "Neue Reservation"}
      </h5>
      <button
        type="button"
        class="btn-close"
        data-bs-dismiss="modal"
        aria-label="Close"
      ></button>
    </div>

    <form
      hx-post="${id ? `/api2/event/form/${id}` : "/api2/event/form"}"
      hx-target="#modal-container .modal-content"
      hx-swap="innerHTML"
    >
      <div class="modal-body" style="min-height: 150px">
        <div class="row mb-3">
          <label for="start" class="col-sm-1 col-form-label">Von:</label>
          <div class="col-sm-5">
            <input
              type="date"
              id="date-start"
              class="form-control"
              name="start"
              value="${start || ""}"
              required
            />
          </div>

          <label for="end" class="col-sm-1 col-form-label">Bis:</label>
          <div class="col-sm-5">
            <input
              type="date"
              id="date-end"
              class="form-control"
              name="end"
              value="${end || ""}"
              required
            />
          </div>
        </div>

        <!-- show price -->
        <div
          class="row"
          id="price-row"
          hx-trigger="change from:#date-start, change from:#date-end"
          hx-include="#date-start, #date-end"
          hx-get="/api2/event/form/price"
          hx-swap="innerHTML"
          hx-target="this"
        >
          ${initialPrice
            ? `<p>${initialPrice}</p>`
            : "<!-- price will be loaded here -->"}
        </div>

        ${isAdmin
          ? `
        <div class="row">
          <div class="col-sm-12">
            <label for="username">Username</label>
            <select class="form-control" name="title" id="username">
              ${users
                ?.map(
                  (u) =>
                    `<option value="${u.name}" ${
                      u.name === title ? "selected" : ""
                    }>${u.name}</option>`
                )
                .join("")}
            </select>
          </div>
        </div>
        `
          : `<input type="hidden" name="title" value="${title || ""}" />`}

        <div class="row">
          <p class="text-danger" id="error-msg">${errorMessage || ""}</p>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
          Close
        </button>

        ${id
          ? `
        <button type="button"
                class="btn btn-danger"
                hx-delete="/api2/event/form/${id}"
                hx-params="none">
          Delete
        </button>
        `
          : ""}

        <button type="submit" class="btn btn-primary">Save changes</button>
      </div>

      ${id ? `<input type="hidden" name="id" value="${id}" />` : ""}
    </form>
  `;
}

// Validation schemas
const eventFormSchema = v.object({
  start: v.pipe(
    v.string(),
    v.isoDate("Startdatum muss im ISO-Format sein (YYYY-MM-DD)")
  ),
  end: v.pipe(
    v.string(),
    v.isoDate("Enddatum muss im ISO-Format sein (YYYY-MM-DD)")
  ),
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(20)),
  id: v.optional(v.string()),
});

const priceQuerySchema = v.object({
  start: v.pipe(
    v.string(),
    v.isoDate("Startdatum muss im ISO-Format sein (YYYY-MM-DD)")
  ),
  end: v.pipe(
    v.string(),
    v.isoDate("Enddatum muss im ISO-Format sein (YYYY-MM-DD)")
  ),
});

// GET /api2/event/form/price - Price calculation endpoint
app.get(
  "/price",
  sValidator("query", priceQuerySchema, (result, c) => {
    if (!result.success) {
      console.error("Price query validation failed", { errors: result.error });
      return c.html(
        '<p class="text-danger">Preisberechnung nicht möglich.</p>'
      );
    }
  }),
  async (c) => {
    const validatedQuery = c.req.valid("query");

    // Get singleton instance and calculate price
    const pricingService = PricingService.getInstance();
    const priceString = pricingService.getPriceString(
      validatedQuery.start,
      validatedQuery.end
    );

    return c.html(`<p>${priceString}</p>`);
  }
);

// GET /api2/event/form - Initial form render
app.get("/", async (c) => {
  // Initial form render
  const query = c.req.query();
  const jwtPayload = c.get("jwtPayload");
  const isAdmin = jwtPayload.role === "admin";

  const html = renderEventForm({
    id: query.id,
    start: query.start,
    end: query.end,
    title: query.title || jwtPayload.name,
    mode: query.mode,
    isAdmin,
  });

  return c.html(html);
});

// POST /api2/event/form - Create new event
app.post("/", sValidator("form", eventFormSchema), async (c) => {
  const jwtPayload = c.get("jwtPayload");
  const validatedBody = c.req.valid("form");
  const isAdmin = jwtPayload.role === "admin";

  // event.end is exclusive in FullCalendar, so we need to add one day
  const endExcl = dayjs(validatedBody.end).add(1, "day").format("YYYY-MM-DD");

  // Authorize user - only admin can create events for other users
  if (!isAdmin && jwtPayload.name !== validatedBody.title) {
    const html = renderEventForm({
      start: validatedBody.start,
      end: validatedBody.end,
      title: validatedBody.title,
      errorMessage: i18n.t("error.unauthorized"),
      isAdmin,
    });
    return c.html(html, 200);
  }

  try {
    // Create event using EventsModelNoLock
    const eventsModel = new EventsModelNoLock();
    await eventsModel.create({
      start: validatedBody.start,
      end: endExcl,
      title: validatedBody.title,
    } as any);

    // On success, trigger HTMX event to close modal and refresh calendar
    c.header("HX-Trigger", "closeModal, refreshCalendar");
    return c.body(null, 204);
  } catch (err) {
    // On error, re-render the form with error message
    const isAdmin = jwtPayload.role === "admin";

    // Determine error message based on error type
    let errorMessage = i18n.t("error.unknownEventError", {
      message: err instanceof Error ? err.message : "Unknown error",
    });
    if (err instanceof EventsError) {
      switch (err.code) {
        case "event_overlaps":
          errorMessage = i18n.t("error.eventOverlaps");
          break;
        case "event_max_days":
          errorMessage = i18n.t("error.eventMaxDays", {
            maxDays: err.data?.maxDays,
          });
          break;
        case "event_min_days":
          errorMessage = i18n.t("error.eventMinDays", {
            minDays: err.data?.minDays,
          });
          break;
        case "event_validation":
          errorMessage = i18n.t("error.eventValidation");
          break;
        case "start_end_required":
          errorMessage = i18n.t("error.listEvents.startEnd");
          break;
        case "event_not_found":
          errorMessage = i18n.t("error.eventNotFound");
          break;
      }
    }

    const html = renderEventForm({
      start: validatedBody.start,
      end: validatedBody.end,
      title: validatedBody.title,
      errorMessage,
      isAdmin,
    });

    return c.html(html, 200); // Return 200 so HTMX will swap the content
  }
});

// POST /api2/event/form/:id - Update existing event
app.post("/:id", sValidator("form", eventFormSchema), async (c) => {
  const jwtPayload = c.get("jwtPayload");
  const validatedBody = c.req.valid("form");
  const eventId = c.req.param("id");
  const isAdmin = jwtPayload.role === "admin";

  // event.end is exclusive in FullCalendar, so we need to add one day
  const endExcl = dayjs(validatedBody.end).add(1, "day").format("YYYY-MM-DD");
  const title = validatedBody.title as string;

  try {
    // Get event from database to check authorization
    const eventsModel = new EventsModelNoLock();
    const eventFromDb = await eventsModel.get(eventId);

    // Authorize user - only admin can update other users' events
    if (
      !isAdmin &&
      (jwtPayload.name !== eventFromDb.title || jwtPayload.name !== title)
    ) {
      const html = renderEventForm({
        id: eventId,
        start: validatedBody.start,
        end: validatedBody.end,
        title: validatedBody.title,
        mode: "edit",
        errorMessage: i18n.t("error.unauthorized"),
        isAdmin,
      });
      return c.html(html, 200);
    }

    // Update the event
    await eventsModel.update(eventFromDb, {
      ...eventFromDb,
      start: validatedBody.start,
      end: endExcl,
      title: validatedBody.title,
    } as any);

    // On success, trigger HTMX event to close modal and refresh calendar
    c.header(
      "HX-Trigger",
      JSON.stringify({ closeModal: true, refreshCalendar: true })
    );
    return c.body(null, 204);
  } catch (err) {
    // On error, re-render form with error
    const isAdmin = jwtPayload.role === "admin";

    // Determine error message based on error type
    let errorMessage = i18n.t("error.unknownEventError", {
      message: err instanceof Error ? err.message : "Unknown error",
    });
    if (err instanceof EventsError) {
      switch (err.code) {
        case "event_overlaps":
          errorMessage = i18n.t("error.eventOverlaps");
          break;
        case "event_max_days":
          errorMessage = i18n.t("error.eventMaxDays", {
            maxDays: err.data?.maxDays,
          });
          break;
        case "event_min_days":
          errorMessage = i18n.t("error.eventMinDays", {
            minDays: err.data?.minDays,
          });
          break;
        case "event_validation":
          errorMessage = i18n.t("error.eventValidation");
          break;
        case "event_not_found":
          errorMessage = i18n.t("error.eventNotFound");
          break;
        case "event_updated":
          errorMessage = i18n.t("error.eventUpdated");
          break;
      }
    }

    const html = renderEventForm({
      id: eventId,
      start: validatedBody.start,
      end: validatedBody.end,
      title: validatedBody.title,
      mode: "edit",
      errorMessage,
      isAdmin,
    });

    return c.html(html, 200); // Return 200 so HTMX will swap the content
  }
});

// DELETE /api2/event/form/:id - Delete event
app.delete("/:id", async (c) => {
  const jwtPayload = c.get("jwtPayload");
  const eventId = c.req.param("id");
  const isAdmin = jwtPayload.role === "admin";

  try {
    // Get event from database to check authorization
    const eventsModel = new EventsModelNoLock();
    const eventFromDb = await eventsModel.get(eventId);

    // Authorize user - only admin can delete other users' events
    if (!isAdmin && jwtPayload.name !== eventFromDb.title) {
      return c.html(
        `<div class="alert alert-danger">${i18n.t("error.unauthorized")}</div>`,
        200
      );
    }

    // Delete the event from database
    await eventsModel.remove(eventFromDb);

    // On success, trigger HTMX event to close modal and refresh calendar
    c.header(
      "HX-Trigger",
      JSON.stringify({ closeModal: true, refreshCalendar: true })
    );
    return c.body(null, 204);
  } catch (err) {
    // On error, return error message with proper i18n
    let errorMessage = i18n.t("error.unknownEventError", {
      message: err instanceof Error ? err.message : "Unknown error",
    });
    if (err instanceof EventsError) {
      switch (err.code) {
        case "event_not_found":
          errorMessage = i18n.t("error.eventNotFound");
          break;
        case "event_updated":
          errorMessage = i18n.t("error.eventUpdated");
          break;
      }
    }
    return c.html(`<div class="alert alert-danger">${errorMessage}</div>`, 200);
  }
});

export default app;
