// @ts-check

const {
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const dayjs = require("dayjs");
const { UsersModel: Users } = require("./users.model");
const { initDB } = require("../db2");
const i18n = require("../i18n");
const { getEnv } = require("../secrets");

const maxDays = 90;

/**
 * @typedef {import("../db2").DB} DB
 */

/**
 * @typedef {Object} Event
 * @property {string} id
 * @property {string} title
 * @property {string} start
 * @property {string} end
 * @property {string} [type]
 * @property {string} [color]
 * @property {number} [version]
 */

/**
 * @class EventsError
 * @classdesc Custom error class for events
 * @extends {Error}
 */
export class EventsError extends Error {
  /**
   * @param {string} message - The error message
   * @param {"start_end_required"|
   *         "end_before_start"|
   *         "event_not_found"|
   *         "event_overlaps"|
   *         "event_max_days"|
   *         "event_min_days"|
   *         "event_validation"|
   *         "event_updated"} errorCode - The error code
   * @param {Object} [data] - Additional data for the error
   * @param {boolean} [data.overlap_start] - Indicates if there is an overlap at the start
   * @param {boolean} [data.overlap_end] - Indicates if there is an overlap at the end
   * @param {number} [data.maxDays] - The maximum number of days allowed
   * @param {number} [data.minDays] - The minimum number of days required
   */
  constructor(message, errorCode, data = {}) {
    super(message);
    this.code = errorCode;
    this.data = data;
  }
}

/**
 * @class EventsModel
 * @classdesc A class to handle events in a DynamoDB table
 * @property {Object} #db - The database connection
 */
export class EventsModelNoLock {
  /**
   * @type {DB}
   */
  #db;

  constructor() {
    this.#db = initDB(getEnv("EVENTS_TABLE"));
  }

  /**
   * Retrieves a list of events within the specified start and end dates.
   * @param {string | undefined} start - The start date of the range.
   * @param {string | undefined } end - The end date of the range.
   * @returns {Promise<Array<Event>>} - A promise that resolves to an array of event objects.
   * @throws {createError.BadRequest} - If start or end query params are missing.
   */
  async list(start, end) {
    if (!start || !end) {
      throw new EventsError(
        "start and end params are required",
        "start_end_required"
      );
    }

    if (end <= start) {
      throw new EventsError(
        "End date must be after start date",
        "end_before_start"
      );
    }

    // query db with start-date-index: PK = 'EVENT', FROM < start-date < TO
    const queryInput = {
      TableName: this.#db.tableName,
      IndexName: "startDateIndex",
      KeyConditionExpression:
        "#PK = :PK AND (startDate BETWEEN :start AND :end)",
      ExpressionAttributeValues: {
        ":PK": "EVENT",
        ":start": start,
        ":end": end,
      },
      ExpressionAttributeNames: {
        "#PK": "PK",
      },
    };

    const dbCmd = new QueryCommand(queryInput);
    const data = await (await this.#db.client).send(dbCmd);
    if (!data.Items) {
      return [];
    }

    return data.Items.map(
      /** @param {Record<string, any>} item */ (item) => {
        const { startDate: start, endDate: end, SK: id, title, ...rest } = item;
        // validate event data
        if (!id || !title || !start || !end) {
          throw new EventsError("Event data is invalid", "event_validation");
        }
        /** @type {Event} */ const event = {
          id,
          title,
          start,
          end,
          ...rest,
        };
        return event;
      }
    );
  }

  /**
   * Create a new event
   * @param {Event} event - event to create
   * @returns {Promise<Event>} - created event
   * @throws {EventsError} - If event data is invalid
   * @throws {EventsError} - If event overlaps with another
   * @throws {Error} - If DynamoDB operation fails
   */
  async create(event) {
    this.#validateEvent(event);

    event.id = uuidv4();

    const eventPutInputOp = {
      Put: {
        TableName: this.#db.tableName,
        Item: {
          PK: "EVENT",
          SK: event.id,
          startDate: event.start,
          endDate: event.end,
          title: event.title,
          version: 0,
        },
        ConditionExpression: "attribute_not_exists(SK)",
      },
    };

    // for each night of the event, create reservation slot item
    // with PK = 'SLOT', SK = date, eventId = event.id
    const slotPutInputOps = [];
    this.#getSlotDates(event.start, event.end).forEach((date) => {
      slotPutInputOps.push({
        Put: {
          TableName: this.#db.tableName,
          Item: {
            PK: "SLOT",
            SK: date,
            eventId: event.id,
          },
          ConditionExpression: "attribute_not_exists(SK)",
        },
      });
    });

    try {
      const result = await (
        await this.#db.client
      ).send(
        new TransactWriteCommand({
          TransactItems: [eventPutInputOp, ...slotPutInputOps],
        })
      );
      return event;
    } catch (error) {
      if (error.name === "TransactionCanceledException") {
        const [eventItemReason, ...slotItemsReasons] =
          error.CancellationReasons;

        if (eventItemReason.Code !== "None") {
          throw new Error(
            "Transaction was canceled. Reasons: " +
              JSON.stringify(error.CancellationReasons)
          );
        }

        const hasConflict = slotItemsReasons.some((reason) => {
          if (
            reason.Code !== "ConditionalCheckFailed" &&
            reason.Code !== "None"
          ) {
            throw new Error(
              "Transaction was canceled. Reasons: " +
                JSON.stringify(error.CancellationReasons)
            );
          }
          return reason.Code === "ConditionalCheckFailed";
        });

        if (hasConflict) {
          throw new EventsError(
            "Event overlaps with another",
            "event_overlaps"
          );
        }
      }
      throw error;
    }
  }

  /**
   * Create multiple events
   * @param {Event[]} events - events to create
   * @returns {Promise<Event[]>} - created events
   * @throws {EventException} - If event duration is greater than maxDays
   * @throws {Error} - If DynamoDB operation fails
   */
  async batchCreate(events) {
    for (const event of events) {
      await this.create(event);
    }
    return events;
  }

  /**
   * Update an event
   * @param {Event} eventFromDb - event from database
   * @param {Event} event - event to update
   * @returns {Promise<Event>} - updated event
   * @throws {EventsError} - If event data is invalid
   * @throws {EventsError} - If event overlaps with another
   * @throws {EventsError} - If event was updated by another user
   * @throws {Error} - If DynamoDB operation fails
   */
  async update(eventFromDb, event) {
    this.#validateEvent(event);

    const slotDatesFromDb = this.#getSlotDates(
      eventFromDb.start,
      eventFromDb.end
    );
    const slotDates = this.#getSlotDates(event.start, event.end);
    const addedDates = [...slotDates].filter(
      (date) => !slotDatesFromDb.has(date)
    );
    const removedDates = [...slotDatesFromDb].filter(
      (date) => !slotDates.has(date)
    );

    const txOps = [];

    const updateInputOp = {
      Update: {
        TableName: this.#db.tableName,
        Key: {
          PK: "EVENT",
          SK: event.id,
        },
        UpdateExpression:
          "set #start = :start, #end = :end, title = :title, version = version + :one",
        ConditionExpression: "version = :version",
        ExpressionAttributeValues: {
          ":version": eventFromDb.version,
          ":one": 1,
          ":start": event.start,
          ":end": event.end,
          ":title": event.title,
        },
        ExpressionAttributeNames: {
          "#start": "startDate",
          "#end": "endDate",
        },
      },
    };
    txOps.push(updateInputOp);

    if (addedDates.length > 0) {
      const slotItems = addedDates.map((date) => ({
        Put: {
          TableName: this.#db.tableName,
          Item: {
            PK: "SLOT",
            SK: date,
            eventId: event.id,
          },
          ConditionExpression: "attribute_not_exists(SK)",
        },
      }));
      txOps.push(...slotItems);
    }
    if (removedDates.length > 0) {
      const slotItems = removedDates.map((date) => ({
        Delete: {
          TableName: this.#db.tableName,
          Key: {
            PK: "SLOT",
            SK: date,
          },
        },
      }));
      txOps.push(...slotItems);
    }

    const txCmd = new TransactWriteCommand({ TransactItems: txOps });
    try {
      await (await this.#db.client).send(txCmd);
    } catch (error) {
      if (error.name === "TransactionCanceledException") {
        const [updateInputOpReason, ...slotItemsReasons] =
          error.CancellationReasons;
        if (updateInputOpReason.Code === "ConditionalCheckFailed") {
          throw new EventsError(
            "Event was updated by another user",
            "event_updated"
          );
        }
        const hasConflict = slotItemsReasons.some((reason) => {
          if (
            reason.Code !== "ConditionalCheckFailed" &&
            reason.Code !== "None"
          ) {
            throw new Error(
              "Transaction was canceled. Reasons: " +
                JSON.stringify(error.CancellationReasons)
            );
          }
          return reason.Code === "ConditionalCheckFailed";
        });
        if (hasConflict) {
          throw new EventsError(
            "Event overlaps with another",
            "event_overlaps"
          );
        }
      }
      throw error;
    }

    return event;
  }

  /**
   * Get an event
   * @param {string} eventId - event id
   * @returns {Promise<Event>} - event
   * @throws {createError.NotFound} - If event not found
   * @throws {Error} - If DynamoDB operation fails
   */
  async get(eventId) {
    const getDbOpParams = {
      TableName: this.#db.tableName,
      Key: {
        PK: "EVENT",
        SK: eventId,
      },
    };
    const getDbOp = new GetCommand(getDbOpParams);
    const data = await (await this.#db.client).send(getDbOp);
    if (!data.Item) {
      throw new EventsError("Event not found", "event_not_found");
    }
    /** @type {Event} */ const event = {
      id: data.Item.SK,
      title: data.Item.title,
      start: data.Item.startDate,
      end: data.Item.endDate,
      version: data.Item.version,
    };

    return event;
  }

  /**
   * Remove an event
   * @param {Event} event - event to remove
   * @throws {EventException} - If event not found
   * @throws {Error} - If DynamoDB operation fails
   * @returns {Promise<void>}
   */
  async remove(event) {
    const deleteDbOp = {
      Delete: {
        TableName: this.#db.tableName,
        Key: {
          PK: "EVENT",
          SK: event.id,
        },
        ConditionExpression: "version = :version",
        ExpressionAttributeValues: {
          ":version": event.version,
        },
      },
    };

    const deleteSlotOps = [];
    for (
      let date = dayjs(event.start);
      date.isBefore(dayjs(event.end).add(-1, "day"));
      date = date.add(1, "day")
    ) {
      deleteSlotOps.push({
        Delete: {
          TableName: this.#db.tableName,
          Key: {
            PK: "SLOT",
            SK: date.format("YYYY-MM-DD"),
          },
        },
      });
    }

    const txOps = [deleteDbOp, ...deleteSlotOps];
    const txCmd = new TransactWriteCommand({ TransactItems: txOps });
    try {
      await (await this.#db.client).send(txCmd);
    } catch (error) {
      if (error.name === "TransactionCanceledException") {
        const deleteDbOpReason = error.CancellationReasons[0];
        if (deleteDbOpReason.Code === "ConditionalCheckFailed") {
          throw new EventsError(
            "Event was updated by another user",
            "event_updated"
          );
        } else {
          throw new Error(
            "Transaction was canceled. Reasons: " +
              JSON.stringify(error.CancellationReasons)
          );
        }
      }
      throw error;
    }
  }

  /**
   * Delete events within the specified year.
   * @param {string} year - The year to delete events for.
   * @returns {Promise<void>} - A promise that resolves when the events are deleted.
   */
  async deleteEventsByYear(year) {
    const start = dayjs(year + "-01-01").toISOString();
    const end = dayjs(year + "-12-31").toISOString();
    const events = await this.list(start, end);
    for (const event of events) {
      await this.remove(event);
    }
  }

  /**
   * Get set of dates between start and end
   * @param {string} start - start date, in format 'YYYY-MM-DD'
   * @param {string} end - end date, in format 'YYYY-MM-DD'
   * @returns {Set<string>} - set of dates
   */
  #getSlotDates(start, end) {
    const slotDates = new Set();
    for (
      let date = dayjs(start);
      date.isBefore(dayjs(end).add(-1, "day"));
      date = date.add(1, "day")
    ) {
      slotDates.add(date.format("YYYY-MM-DD"));
    }
    return slotDates;
  }

  /**
   * Validate event data
   * @param {Event} event - event data
   * @throws {EventsError} - If event data is invalid
   * @returns {void}
   */
  #validateEvent(event) {
    if (!event.title || !event.start || !event.end) {
      throw new EventsError(
        "error.eventStartEndRequired",
        "start_end_required"
      );
    }
    const startDate = new Date(event.start).getTime();
    const endDate = new Date(event.end).getTime();

    if (startDate > endDate) {
      throw new EventsError("error.eventStartAfterEndDate", "event_validation");
    }

    if ((endDate - startDate) / (1000 * 60 * 60 * 24) > maxDays) {
      throw new EventsError(
        "Reservations are limited to " + maxDays + " nights",
        "event_max_days",
        { maxDays: maxDays }
      );
    }

    // check if resevation is at least for one night (end date is exclusive)
    if (dayjs(event.start).add(2, "day").isAfter(dayjs(event.end))) {
      throw new EventsError(
        "Reservations must be at least for one night",
        "event_min_days",
        { minDays: 2 }
      );
    }

    // check if title is valid
    if (!new Users().isValidUser(event.title)) {
      throw new EventsError(
        i18n.t("error.eventInvalidTitle", { title: event.title }),
        "event_validation"
      );
    }
  }
}
