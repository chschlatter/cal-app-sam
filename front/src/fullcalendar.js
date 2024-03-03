import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import bootstrapPlugin from "@fullcalendar/bootstrap5";
import dayjs from "dayjs";

export function getCalendar(element, onSelect, onEventClick) {
  const fcOptions = {
    plugins: [dayGridPlugin, interactionPlugin, bootstrapPlugin],
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
    // events: "/api/events",
    events: {
      url: window.App.apiUrl + "/events",
      method: "get",
      dataType: "json",
    },
    selectable: true,
    select: onSelect,
    eventClick: onEventClick,
    longPressDelay: 100,
  };

  return new Calendar(element, fcOptions);
}

export function getEventForCalEvent(calEvent, create = false, title = null) {
  // subtract one day from end date with dayjs
  const endDate = dayjs(calEvent.end);
  let endInclStr = endDate.subtract(1, "day").format("YYYY-MM-DD");

  if (create && endDate.diff(calEvent.start, "day") == 1) {
    endInclStr = endDate.add(6, "day").format("YYYY-MM-DD");
  }

  const event = {
    start: calEvent.startStr || dayjs(calEvent.start).format("YYYY-MM-DD"),
    end: calEvent.endStr || endDate.format("YYYY-MM-DD"),
    endIncl: endInclStr,
  };
  calEvent.id && (event.id = calEvent.id);
  calEvent.title && (event.title = calEvent.title);
  title && (event.title = title);

  if (calEvent.id) {
    event.id = calEvent.id;
  }
  return event;
}
