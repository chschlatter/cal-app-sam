// @ts-check

const Polyglot = require("node-polyglot");
const locale = "de_CH";

const phrases = {
  en: {
    "error.internalServerError": "Internal Server Error.",
    "error.wrongMethod": "%{handler} only accepts %{method} method.",
    "error.invalidRequestBody": "Invalid request body.",
    "error.login.missingName": "Missing login name.",
    "error.missingIdinPath": "Please provide id in path.",
    "error.listEvents.startEnd": "Please provide start and end query params.",
    "error.eventNotFound": "Event not found.",
    "error.eventOverlaps": "Event overlaps with existing event.",
    "error.eventMaxDays": "Event exceeds maximum of %{maxDays} days.",
    "error.unauthorized": "Unauthorized.",
    "error.unknownEventError": "Unknown EventError [%{message}].",
  },
  de_CH: {
    "error.internalServerError": "Interner Serverfehler.",
    "error.wrongMethod": "%{handler} akzeptiert nur die Methode %{method}.",
    "error.invalidRequestBody": "Ungültiger Request-Body.",
    "error.login.missingName": "Fehlender Login-Name.",
    "error.missingIdinPath": "Bitte geben Sie die ID im Pfad an.",
    "error.listEvents.startEnd":
      "Bitte geben Sie die Start- und End-Abfrageparameter an.",
    "error.eventNotFound": "Reservation nicht gefunden.",
    "error.eventOverlaps":
      "Reservation überschneidet sich mit bestehender Reservation.",
    "error.eventMaxDays":
      "Reservation überschreitet das Maximum von %{maxDays} Tagen.",
    "error.unauthorized": "Unberechtigt.",
    "error.unknownEventError": "Unbekannter EventError [%{message}].",
  },
};

const i18n = new Polyglot({ phrases: phrases[locale], locale });

module.exports = i18n;
