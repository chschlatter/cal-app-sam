import { Pricing } from "./calPricing.js";
const pricing = new Pricing();

export default (user, apiUrl) => ({
  event: {},
  isLoading: false,
  errorMessage: "",
  overlap_start: false,
  overlap_end: false,
  userOptions: [],

  init() {
    pricing.init(apiUrl);
    if (this.isUserAdmin) {
      api(`${apiUrl}/users`)
        .then((users) => {
          this.userOptions = users;
        })
        .catch((error) => {
          console.error("getUsers(): " + error.message);
        });
    }
  },

  get isUserAdmin() {
    return user.role == "admin";
  },

  get username() {
    return user.name;
  },

  getPriceStr(start, end) {
    return pricing.getCostAndNightsString(start, end);
  },

  deleteEvent() {
    this.isLoading = true;
    api(`${apiUrl}/events/${this.event.id}`, "delete")
      .then(() => {
        const calEvent = window.App.calendar.getEventById(this.event.id);
        calEvent && calEvent.remove();
        window.App.eventModal.hide();
      })
      .catch((error) => {
        this.errorMessage = error.message;
        console.log(
          "deleteEvent(): [" + error.status + "] " + error.data.message
        );
      })
      .finally(() => {
        this.isLoading = false;
      });
  },

  addEvent() {
    try {
      this.isLoading = true;

      // event.end is exclusive, so we need to add one day
      this.event.end = addDays(this.event.endIncl, 1);

      const newEvent = {
        title: this.event.title,
        start: this.event.start,
        end: this.event.end,
      };

      api(`${apiUrl}/events`, "post", newEvent)
        .then((event) => {
          this.overlap_start = false;
          this.overlap_end = false;
          // second param TRUE selects first event source,
          // without this, we get duplicated events with refetchEvents()
          // see https://fullcalendar.io/docs/Calendar-addEvent
          window.App.calendar.addEvent(event, true);
          window.App.eventModal.hide();
        })
        .catch((error) => {
          ({
            message: this.errorMessage,
            overlap_start: this.overlap_start,
            overlap_end: this.overlap_end,
          } = handleApiError(error, "createEvent"));
        })
        .finally(() => {
          this.isLoading = false;
        });
    } catch (error) {
      this.errorMessage = error.message;
      this.isLoading = false;
      return;
    }
  },

  updateEvent() {
    try {
      this.isLoading = true;

      // event.end is exclusive, so we need to add one day
      this.event.end = addDays(this.event.endIncl, 1);

      const updatedEvent = {
        id: this.event.id,
        title: this.event.title,
        start: this.event.start,
        end: this.event.end,
      };

      api(`${apiUrl}/events/${this.event.id}`, "put", updatedEvent)
        .then((event) => {
          const calEvent = window.App.calendar.getEventById(event.id);
          if (!calEvent) {
            throw new Error("Event not found: " + event.id);
          }
          calEvent.setDates(event.start, event.end, { allDay: true });
          calEvent.setProp("title", event.title);
          calEvent.setProp("color", event.color);
          window.App.eventModal.hide();
        })
        .catch((error) => {
          ({
            message: this.errorMessage,
            overlap_start: this.overlap_start,
            overlap_end: this.overlap_end,
          } = handleApiError(error));
        })
        .finally(() => {
          this.isLoading = false;
        });
    } catch (error) {
      this.errorMessage = error.message;
      this.isLoading = false;
      return;
    }
  },
});

function handleApiError(error, action = "updateEvent") {
  const result = {
    message: error.data.message,
    overlap_start: false,
    overlap_end: false,
  };

  if (error.status == 409) {
    result.overlap_start = error.data.overlap_start;
    result.overlap_end = error.data.overlap_end;
  }

  // log error
  console.log(`${action}(): [${error.status}] ${result.message}`);
  console.log(JSON.stringify(error.data));

  return result;
}

async function api(url, method = "get", body) {
  const fetchOptions = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };
  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }
  const response = await fetch(url, fetchOptions);
  const data = await response.json();
  if (!response.ok) {
    throw { status: response.status, data: data };
  }
  return data;
}

// add days to date with Date object; dateStr must be in format YYYY-MM-DD
// return string in format YYYY-MM-DD
function addDays(dateStr, days) {
  const result = new Date(dateStr);
  if (isNaN(result)) {
    throw new Error("Invalid date");
  }
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0];
}
