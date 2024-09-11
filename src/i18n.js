// @ts-check

const Polyglot = require("node-polyglot");
const locale = "de_CH";

const phrases = {
  en: {
    "error.internalServerError": "Internal Server Error.",
    "error.wrongMethod": "%{handler} only accepts %{method} method.",
    "error.invalidRequestBody": "Invalid request body.",
    "errors.missingRequiredProperty": "Missing required property: %{property}",
    "errors.invalidType":
      "Invalid type for property: %{property}, expected %{type}",
    "errors.invalidDateFormat": "Invalid date format for property: %{property}",
    "errors.invalidQueryStringParameter":
      "Invalid query string parameter: %{parameter}",
    "errors.missingPathParameter": "Missing path parameter: %{parameter}",
    "errors.invalidJSONRequestBody": "Invalid JSON in request body",
    "errors.missingRequestBody": "Missing request body",
    "error.login.missingName": "Missing login name.",
    "error.missingIdinPath": "Please provide id in path.",
    "error.listEvents.startEnd": "Please provide start and end query params.",
    "error.eventNotFound": "Event not found.",
    "error.eventOverlaps": "Event overlaps with existing event.",
    "error.eventMaxDays": "Event exceeds maximum of %{maxDays} days.",
    "error.eventValidation": "Event validation error.",
    "error.eventInvalidTitle": "Invalid title %{title}.",
    "error.eventStartAfterEndDate": "Event start is after end date.",
    "error.eventStartEndRequired": "Event start and end required.",
    "error.unauthorized": "Unauthorized.",
    "error.userNotFound": "User not found.",
    "error.missingGoogleAuth": "Missing Google authentication.",
    "error.unknownEventError": "Unknown EventError [%{message}].",
  },
  de_CH: {
    "error.internalServerError": "Interner Serverfehler.",
    "error.wrongMethod": "%{handler} akzeptiert nur die Methode %{method}.",
    "error.invalidRequestBody": "Ungültiger Request-Body.",
    "errors.missingRequiredProperty":
      "Fehlende erforderliche Eigenschaft: %{property}",
    "errors.invalidType":
      "Ungültiger Typ für Eigenschaft: %{property}, erwartet %{type}",
    "errors.invalidDateFormat":
      "Ungültiges Datumsformat für Eigenschaft: %{property}",
    "errors.invalidQueryStringParameter":
      "Ungültiger Query-String-Parameter: %{parameter}",
    "errors.missingPathParameter": "Fehlender Pfadparameter: %{parameter}",
    "errors.invalidJSONRequestBody": "Ungültiges JSON im Request-Body",
    "errors.missingRequestBody": "Fehlender Request-Body",
    "error.login.missingName": "Fehlender Login-Name.",
    "error.missingIdinPath": "Bitte geben Sie die ID im Pfad an.",
    "error.listEvents.startEnd":
      "Bitte geben Sie die Start- und End-Abfrageparameter an.",
    "error.eventNotFound": "Reservation nicht gefunden.",
    "error.eventOverlaps":
      "Reservation überschneidet sich mit bestehender Reservation.",
    "error.eventMaxDays":
      "Reservation überschreitet das Maximum von %{maxDays} Tagen.",
    "error.eventValidation": "Fehler bei der Reservierungsvalidierung.",
    "error.eventInvalidTitle": "Ungültiger Titel %{title}.",
    "error.eventStartAfterEndDate":
      "Start der Reservation liegt nach dem Enddatum.",
    "error.eventStartEndRequired":
      "Start und Ende der Reservation erforderlich.",
    "error.unauthorized": "Unberechtigt.",
    "error.userNotFound": "Benutzer nicht gefunden.",
    "error.missingGoogleAuth": "Fehlende Google-Authentifizierung.",
    "error.unknownEventError": "Unbekannter EventError [%{message}].",
  },
};

if (!phrases[locale]) {
  throw new Error(`Locale '${locale}' not found in phrases.`);
}

const i18n = new Polyglot({ phrases: phrases[locale], locale });

module.exports = i18n;
