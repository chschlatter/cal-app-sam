import { getCalendar, getEventForCalEvent } from "./fullcalendar.js";
import Alpine from "alpinejs";
import Modal from "bootstrap/js/dist/modal";
import calEvent from "./calEvent.js";

Alpine.data("calEvent", calEvent);
window.Alpine = Alpine;

window.App = {};
window.App.apiUrl = "/api";

/*
 * redirect to login page if not authenticated
 * if authenticated:
 *   set window.App.user
 *   warmup api
 *   call init()
 */
fetch(`${window.App.apiUrl}/auth`)
  .then((response) => {
    if (!response.ok) {
      throw response.status;
    }
    return response.json();
  })
  .then((user) => {
    window.App.user = user;

    // warmup api
    const warmupPromise = Promise.all([
      fetch(`${window.App.apiUrl}/events?warmup=true`, { method: "post" }),
      fetch(`${window.App.apiUrl}/events/XXX?warmup=true`, { method: "put" }),
      fetch(`${window.App.apiUrl}/events/XXX?warmup=true`, {
        method: "delete",
      }),
    ]);
    warmupPromise
      .then((responses) => {
        console.log("API warmup completed");
      })
      .catch((error) => {
        console.log("warmup: " + error.message);
      });

    document.querySelector("html").style.visibility = "visible";

    docReady(init);
  })
  .catch((errorStatus) => {
    if (errorStatus == 401) {
      window.location.href = "./login";
    } else {
      console.error(
        window.App.apiUrl + "/auth returned status: " + errorStatus
      );
    }
  });

function init() {
  Alpine.start();
  window.App.eventModal = new Modal(document.getElementById("event-modal"));

  window.App.calendar = getCalendar(
    document.getElementById("calendar"),
    cal_on_select,
    cal_on_eventClick
  );

  window.App.calendar.render();

  setInterval(function () {
    window.App.calendar.refetchEvents();
  }, 10000);

  // resize calendar on window resize (e.g. for mobile devices)
  window.addEventListener("resize", () => {
    if (window.App.calendar) {
      window.App.calendar.setOption("contentHeight", window.innerHeight * 0.7);
    }
  });
}

function cal_on_select(info) {
  const event = getEventForCalEvent(info, true, window.App.user.name);

  const addEventForm = document.getElementById("add-event-form-modal");
  const setEvent = new CustomEvent("set_event", { detail: event });
  addEventForm.dispatchEvent(setEvent);

  window.App.eventModal.show();
}

function cal_on_eventClick(info) {
  const event = getEventForCalEvent(info.event);
  console.log(event);

  // only admin can edit other users' events
  if (window.App.user.role != "admin" && event.title != window.App.user.name) {
    return;
  }

  const addEventForm = document.getElementById("add-event-form-modal");
  const setEvent = new CustomEvent("set_event", { detail: event });
  addEventForm.dispatchEvent(setEvent);

  window.App.eventModal.show();
}

function docReady(fn) {
  // see if DOM is already available
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    // call on next available tick
    setTimeout(fn, 1);
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}
