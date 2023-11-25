var calendar;
var username, role;
var apiUrl = "/api";

$(document).ready(() => {
  $.ajax({
    // url: "/api/auth",
    url: apiUrl + "/auth",
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    type: "get",
    success: (user) => {
      console.log("user: " + JSON.stringify(user));
      username = user.name;
      $("#username").text(username);
      role = user.role;
      $("html").css("visibility", "visible");

      if (role == "admin") {
        update_username_dropdown();
        $("#row-select-username").removeClass("d-none");
      }
    },
    error: (xhr) => {
      if (xhr.status == 401) {
        window.location.href = "./login";
      } else {
        console.log("error: " + xhr.responseText);
        alert("Error: " + xhr.responseText);
      }
    },
  });

  const calendarEl = document.getElementById("calendar");
  calendar = new FullCalendar.Calendar(calendarEl, {
    locale: "de",
    themeSystem: "bootstrap5",
    initialView: "dayGridYear",
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
      url: apiUrl + "/events",
      method: "get",
      dataType: "json",
    },
    selectable: true,
    select: cal_on_select,
    eventClick: cal_on_eventClick,
  });

  $("#submit-btn").click(save_event);
  $("#delete-btn").click(delete_event);

  $("#event-modal").on("hide.bs.modal", reset_modal_form);

  $(".form-control").change(function () {
    $(this).removeClass("is-invalid");
    $("#error-msg").text("");
  });

  calendar.render();

  /*
  console.log(SERVER_VARS);
  */

  setInterval(function () {
    calendar.refetchEvents();
  }, 10000);
});

function cal_on_select(info) {
  $("#input-start-date").val(info.startStr);
  const endDate = dayjs(info.endStr);
  let endDateStr = endDate.subtract(1, "day").format("YYYY-MM-DD");
  if (endDate.diff(info.startStr, "day") == 1) {
    endDateStr = endDate.add(6, "day").format("YYYY-MM-DD");
  }
  $("#input-end-date").val(endDateStr);
  $("#event-modal").modal("show");
}

function cal_on_eventClick(info) {
  const event = info.event;

  // only admin can edit other users' events
  if (role != "admin" && event.title != username) {
    return;
  }

  // update username dropdown
  if (role == "admin") {
    $("#select-username").val(event.title).change();
  }

  const end_date_exclusive = dayjs(event.end);
  const end_date_str = end_date_exclusive
    .subtract(1, "day")
    .format("YYYY-MM-DD");
  $("#event-id").val(event.id);
  $("#event-title").val(event.title);
  $("#input-start-date").val(event.startStr);
  $("#input-end-date").val(end_date_str);

  $("#delete-btn").removeClass("d-none");
  $("#event-modal").modal("show");
}

function modal_on_ajax_error(xhr) {
  try {
    const response = JSON.parse(xhr.responseText);
    console.log("modal_on_ajax_error: " + xhr.responseText);

    if (xhr.status == 409) {
      if (response.overlap_start) {
        $("#input-start-date").addClass("is-invalid");
      }
      if (response.overlap_end) {
        $("#input-end-date").addClass("is-invalid");
      }
    }

    $("#error-msg").text(response.message);
  } finally {
    $(":button").attr("disabled", false);
    $("#submit-btn").html("Save changes");
  }
}

function update_username_dropdown() {
  const request = $.ajax({
    url: "/api/users",
    dataType: "json",
    type: "get",
  });

  request.done(function (response) {
    console.log(response);

    $("#select-username").empty();
    for (var i = 0; i < response.length; i++) {
      let selected = "false";
      if (response[i].name == username) {
        selected = "true";
      }
      jQuery("<option/>", {
        value: response[i].name,
        html: response[i].name,
        selected: selected,
      }).appendTo("#select-username");
    }
  });
}

function save_event(e) {
  const form_data = new FormData(
    document.getElementById("add-event-form-modal")
  );
  const event = Object.fromEntries(form_data);
  event.end = dayjs(event.end).add(1, "day").format("YYYY-MM-DD");

  if (role == "admin") {
    event.title = event.username;
    delete event.username;
  } else {
    event.title = username;
  }

  console.log("save_event (from modal form): " + JSON.stringify(event));

  $(":button").attr("disabled", true);
  $("#submit-btn").html("Saving ...");

  if (event.id) {
    // update existing event

    $.ajax({
      url: apiUrl + "/events/" + encodeURIComponent(event.id),
      contentType: "application/json; charset=utf-8",
      dataType: "json",
      type: "put",
      data: JSON.stringify(event),
      success: function (event_updated) {
        cal_event = calendar.getEventById(event.id);
        console.log(
          "save_event (server response): " + JSON.stringify(event_updated)
        );
        if (cal_event != null) {
          cal_event.setDates(event.start, event.end, { allDay: true });
          cal_event.setProp("title", event.title);
        }
        $("#event-modal").modal("hide");
      },
      error: modal_on_ajax_error,
    });
  } else {
    // create new event
    delete event.id;
    $.ajax({
      url: apiUrl + "/events",
      data: JSON.stringify(event),
      contentType: "application/json; charset=utf-8",
      dataType: "json",
      type: "post",
      success: function (event_created) {
        // second param TRUE selects first event source,
        // without this, we get duplicated events with refetchEvents()
        // see https://fullcalendar.io/docs/Calendar-addEvent
        calendar.addEvent(event_created, true);
        $("#event-modal").modal("hide");
      },
      error: modal_on_ajax_error,
    });
  }
}

function delete_event(e) {
  const form_data = new FormData(
    document.getElementById("add-event-form-modal")
  );
  const event = Object.fromEntries(form_data);
  event.end = dayjs(event.end).add(1, "day").format("YYYY-MM-DD");
  console.log("delete_event(): " + JSON.stringify(event));

  $(":button").attr("disabled", true);
  $("#delete-btn").html("Deleting ...");

  $.ajax({
    url: apiUrl + "/events/" + encodeURIComponent(event.id),
    // dataType: 'json',
    type: "delete",
    success: function () {
      cal_event = calendar.getEventById(event.id);
      if (cal_event != null) {
        cal_event.remove();
      }
      $("#event-modal").modal("hide");
    },
    error: modal_on_ajax_error,
  });
}

function reset_modal_form() {
  $("#add-event-form-modal .is-invalid").removeClass("is-invalid");
  $("#error-msg").text("");
  $("#delete-btn").addClass("d-none");
  $("#event-id").val("");
  $("#event-title").val("");
  $(":button").attr("disabled", false);
  $("#submit-btn").html("Save changes");
  $("#select-username").val(username).change();
  $("#delete-btn").html("Delete");
}
