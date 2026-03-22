import { Hono } from "hono";
import type { Variables } from "../types";
import {
  bsCssColors,
  bsCssCDNLinks,
  bsJSCDNLinks,
} from "src/lib/webComponents";

const app = new Hono<{ Variables: Variables }>();

// GET / - Index page
app.get("/", async (c) => {
  // Get authenticated user from JWT payload
  const jwtPayload = c.get("jwtPayload");
  const currentUser = {
    name: jwtPayload.name,
    role: jwtPayload.role,
  };

  return c.html(/* HTML */ `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Adelboden Kalender</title>
        ${bsCssCDNLinks()} ${bsCssColors()}
        <script
          src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.8/dist/htmx.min.js"
          integrity="sha384-/TgkGk7p307TH7EXJDuUlgG3Ce1UVolAOFopFekQkkXihi5u/6OCvVKyz1W+idaz"
          crossorigin="anonymous"
        ></script>
        <script
          src="https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.20/index.global.min.js"
          integrity="sha256-uP+93O5+FlYtF5exLj1BEhhOJ0fIqhxzn7mf7sumE7U="
          crossorigin="anonymous"
        ></script>
        <script
          src="https://cdn.jsdelivr.net/npm/@fullcalendar/bootstrap5@6.1.20/index.global.min.js"
          integrity="sha256-X0gljZ3xBFFdnWNudR9urm6+qPyqrOnw1qF0B0Jne+4="
          crossorigin="anonymous"
        ></script>
        <script
          src="https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.20/index.global.min.js"
          integrity="sha256-2n+/xyo0A97DAW02UWJZ37Q3/0e2z6RLntV4uqNjiGo="
          crossorigin="anonymous"
        ></script>
        <script
          src="https://cdn.jsdelivr.net/npm/@fullcalendar/interaction@6.1.20/index.global.min.js"
          integrity="sha256-AOFJFpMRpBEO1SLoCkP9zfgdxQ8pC0VGpA+TeGUOa1o="
          crossorigin="anonymous"
        ></script>
        <script
          src="https://cdn.jsdelivr.net/npm/dayjs@1.11.19/dayjs.min.js"
          integrity="sha256-nP25Pzivzy0Har7NZtMr/TODzfGWdlTrwmomYF2vQXM="
          crossorigin="anonymous"
        ></script>
        <script>
          window.App = {};

          const initializeApp = function () {
            // Global HTMX event handler for 401 responses
            document.body.addEventListener(
              "htmx:responseError",
              function (event) {
                if (event.detail.xhr.status === 401) {
                  window.location.href = "./login";
                }
              }
            );

            // Initialize FullCalendar
            const calendarEl = document.getElementById("calendar");
            window.App.calendar = new FullCalendar.Calendar(calendarEl, {
              locale: "de",
              themeSystem: "bootstrap5",
              initialView: "dayGridYear",
              views: {
                dayGridMonth: {
                  titleFormat: { month: "short", year: "2-digit" },
                },
              },
              contentHeight: window.innerHeight * 0.7,
              monthStartFormat: { month: "short", year: "numeric" },
              buttonText: {
                today: "Heute",
                year: "Jahr",
                month: "Monat",
                week: "Woche",
                day: "Tag",
                list: "Liste",
              },
              headerToolbar: {
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,dayGridYear",
              },
              firstDay: 1,
              events: {
                url: "/api2/events",
                method: "get",
                dataType: "json",
                failure: function (error) {
                  // Redirect to login if unauthorized
                  if (error.response && error.response.status === 401) {
                    window.location.href = "./login";
                  } else {
                    console.error("Failed to fetch events:", error);
                  }
                },
              },
              selectable: true,
              select: function (info) {
                const endDate = dayjs(info.endStr);
                if (endDate.diff(dayjs(info.startStr), "day") === 1) {
                  // single day selected, add 6 days to end date
                  info.endStr = endDate.add(6, "day").format("YYYY-MM-DD");
                } else {
                  // multiple days selected, subtract 1 day from end date
                  info.endStr = endDate.subtract(1, "day").format("YYYY-MM-DD");
                }
                info.startStr = dayjs(info.startStr).format("YYYY-MM-DD");

                htmx.trigger(document.body, "openModal", {
                  start: info.startStr,
                  end: info.endStr,
                  mode: "create",
                });
              },
              eventClick: function (info) {
                // only admin can edit other users' events
                if (
                  window.App.currentUser.role !== "admin" &&
                  info.event.title !== window.App.currentUser.name
                ) {
                  return;
                }

                htmx.trigger(document.body, "openModal", {
                  id: info.event.id,
                  start: dayjs(info.event.start).format("YYYY-MM-DD"),
                  end: dayjs(info.event.end)
                    .subtract(1, "day")
                    .format("YYYY-MM-DD"),
                  title: info.event.title,
                  mode: "edit",
                });
              },
            });
            window.App.calendar.render();

            // Refresh calendar events every 10 seconds
            setInterval(function () {
              window.App.calendar.refetchEvents();
            }, 10000);

            // resize calendar on window resize (e.g. for mobile devices)
            window.addEventListener("resize", () => {
              if (window.App.calendar) {
                window.App.calendar.setOption(
                  "contentHeight",
                  window.innerHeight * 0.7
                );
              }
            });
          };

          // Set current user from server-side data
          window.App.currentUser = ${JSON.stringify(currentUser)};

          // Check if DOM is already loaded
          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", initializeApp);
          } else {
            // DOM already loaded, execute immediately
            initializeApp();
          }
        </script>
      </head>
      <body>
        <div class="container">
          <div class="page-header mt-2">
            <div class="row align-items-center">
              <div class="col">
                <h2>Adelboden Kalender</h2>
              </div>
              <div class="col text-end">
                <p>Angemeldet als: ${currentUser.name}</p>
              </div>
            </div>
          </div>

          <hr />

          <div id="calendar"></div>
        </div>

        <!-- htmx modal -->
        <div
          id="modal-container"
          class="modal fade"
          tabindex="-1"
          hx-get="/api2/event/form"
          hx-trigger="openModal from:body"
          hx-vals="js:{...event.detail}"
          hx-target="#modal-container .modal-content"
          hx-swap="innerHTML"
          hx-on:close-modal="$('#modal-container').modal('hide');"
          hx-on:refresh-calendar="window.App.calendar.refetchEvents();"
        >
          <div class="modal-dialog modal-dialog-centered">
            <div
              class="modal-content"
              hx-on::after-swap="$('#modal-container').modal('show')"
            >
              <!-- Content loaded via HTMX -->
            </div>
          </div>
        </div>
        ${bsJSCDNLinks()}
      </body>
    </html>`);
});

export default app;
