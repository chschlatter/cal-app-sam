# Routes

**`GET /`** — Serves the main calendar page (server-rendered HTML with FullCalendar via CDN).

**`GET /login`** — Serves the login page.
**`POST /login/form`** — htmx: validates credentials, sets JWT cookie, redirects on success or re-renders form with error.

**`GET /api2/events`** — Returns events filtered by date range (used by FullCalendar on page load).

**`GET /api2/event/form`** — htmx: renders the empty event creation form.
**`GET /api2/event/form/price`** — htmx: returns a price string for a given date range.
**`POST /api2/event/form`** — htmx: creates an event from form submission.
**`POST /api2/event/form/:id`** — htmx: updates an event from form submission.
**`DELETE /api2/event/form/:id`** — htmx: deletes an event.

*The following routes are not used by the current UI but kept for future API use:*

**`POST /api2/events`** — Creates a new event.
**`PUT /api2/events/:id`** — Updates an existing event.
**`DELETE /api2/events/:id`** — Deletes an event.
