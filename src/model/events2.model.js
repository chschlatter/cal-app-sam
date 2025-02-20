// @ts-check

const createError = require("http-errors");
const {
  GetCommand,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const dayjs = require("dayjs");
const { UsersModel: Users } = require("../model/users.model");
const { dynamoLock2 } = require("../dynamo-lock");
const { initDB } = require("../db2");
const i18n = require("../i18n");
const { getEnv } = require("../secrets");

const maxDays = 100;

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
 */

/**
 * @class EventsError
 * @classdesc Custom error class for events
 * @extends {Error}
 */
export class EventsError extends Error {
  /**
   * @param {string} message
   * @param {"start_end_required"|"event_not_found"|"event_overlaps"|"event_max_days"|"event_validation"} errorCode
   * @param {Object} [data]
   * @param {boolean} [data.overlap_start]
   * @param {boolean} [data.overlap_end]
   * @param {number} [data.maxDays]
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
export class EventsModel {
  /**
   * @type {DB}
   */
  #db;

  constructor() {
    this.#db = initDB(getEnv("EVENTS_TABLE"));
  }

  /**
   * Retrieves a list of events within the specified start and end dates.
   * @param {string} start - The start date of the range.
   * @param {string} end - The end date of the range.
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

    const dbCmd = this.#getDbCommand("list", {
      id: "",
      title: "",
      start: start,
      end: end,
    });
    const data = await (await this.#db.client).send(dbCmd);

    return data.Items.map(
      /** @param {Event} item */ (item) => {
        item.color = new Users().getUserColor(item.title);
        return item;
      }
    );
  }

  /**
   * Create a new event
   * @param {Event} event - event to create
   * @returns {Promise<Event>} - created event
   * @throws {EventException} - If event duration is greater than maxDays
   * @throws {Error} - If DynamoDB operation fails
   */
  async create(event) {
    this.#validateEvent(event);

    // lock cal_events table
    const unlock = await dynamoLock2(this.#db);

    try {
      // check if event overlaps with another
      await this.#checkOverlaps(event);

      event.id = uuidv4();
      event.type = "event";
      event.color = new Users().getUserColor(event.title);
      const dbCmd = this.#getDbCommand("create", event);
      await (await this.#db.client).send(dbCmd);
    } finally {
      // unlock cal_events table
      await unlock();
    }
    return event;
  }

  /**
   * Create multiple events
   * @param {Event[]} events - events to create
   * @returns {Promise<Event[]>} - created events
   * @throws {EventException} - If event duration is greater than maxDays
   * @throws {Error} - If DynamoDB operation fails
   */
  async batchCreate(events) {
    const unlock = await dynamoLock2(this.#db);
    try {
      for (const event of events) {
        this.#validateEvent(event);
        await this.#checkOverlaps(event);
        event.id = uuidv4();
        event.type = "event";
        const dbCmd = this.#getDbCommand("create", event);
        await (await this.#db.client).send(dbCmd);
      }
    } finally {
      await unlock();
    }
    return events;
  }

  /**
   * Update an event
   * @param {Event} event - event to update
   * @returns {Promise<Event>} - updated event
   * @throws {EventException} - If event not found
   * @throws {Error} - If DynamoDB operation fails
   */
  async update(event) {
    this.#validateEvent(event);
    const dbCmd = this.#getDbCommand("update", event);

    // lock cal_events table
    const unlock = await dynamoLock2(this.#db);
    try {
      // check if event overlaps with another
      await this.#checkOverlaps(event);
      // update event
      try {
        await (await this.#db.client).send(dbCmd);
      } catch (err) {
        if (err.code === "ResourceNotFoundException") {
          throw new EventsError("Event not found", "event_not_found");
        } else {
          throw err;
        }
      }
    } finally {
      // unlock cal_data table
      await unlock();
    }
    event.color = new Users().getUserColor(event.title);
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
    const dbCmd = this.#getDbCommand("get", {
      id: eventId,
      title: "",
      start: "",
      end: "",
    });
    const data = await (await this.#db.client).send(dbCmd);
    if (!data.Item) {
      throw new EventsError("Event not found", "event_not_found");
    }
    return data.Item;
  }

  /**
   * Remove an event
   * @param {string} eventId - event id
   * @throws {EventException} - If event not found
   * @throws {Error} - If DynamoDB operation fails
   * @returns {Promise<void>}
   */
  async remove(eventId) {
    const dbCmd = this.#getDbCommand("remove", {
      id: eventId,
      title: "",
      start: "",
      end: "",
    });
    try {
      await (await this.#db.client).send(dbCmd);
    } catch (err) {
      if (err.code === "ResourceNotFoundException") {
        throw new EventsError("Event not found", "event_not_found");
      } else {
        throw err;
      }
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
      await this.remove(event.id);
    }
  }

  /**
   * Check if event overlaps with another
   * @param {Event} event - event to check
   * @returns {Promise<void>}
   * @throws {createError.Conflict} - If event overlaps with another
   * @throws {Error} - If DynamoDB operation fails
   */
  async #checkOverlaps(event) {
    const dbCmd = this.#getDbCommand("checkOverlaps", event);
    const data = await (await this.#db.client).send(dbCmd);

    console.log("checkOverlaps", data, event);
    // throw http error if event overlaps with another
    if (data.Count > 0) {
      let errorData = {
        overlap_start: false,
        overlap_end: false,
      };

      /* TODO: what if multiple events overlap? */
      data.Items.forEach((item) => {
        if (event.start >= item.start) {
          errorData.overlap_start = true;
        }
        if (event.end <= item.end) {
          errorData.overlap_end = true;
        }
      });

      throw new EventsError(
        "Event overlaps with another",
        "event_overlaps",
        errorData
      );
    }
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

    // check if title is valid
    if (!new Users().isValidUser(event.title)) {
      throw new EventsError(
        i18n.t("error.eventInvalidTitle", { title: event.title }),
        "event_validation"
      );
    }
  }

  /**
   * Get DynamoDB command
   * @param {string} method - method to call
   * @param {Event} event - event data
   * @returns {import("@aws-sdk/lib-dynamodb").DynamoDBDocumentClientCommand} - DynamoDB command
   */
  #getDbCommand(method, event) {
    const baseParams = {
      TableName: this.#db.tableName,
    };
    let params;
    switch (method) {
      case "list":
        params = {
          ...baseParams,
          IndexName: "type-end-index",
          KeyConditionExpression: "#type = :type AND #end >= :start",
          FilterExpression: "#start <= :end",
          ExpressionAttributeValues: {
            ":type": "event",
            ":start": event.start,
            ":end": event.end,
          },
          ExpressionAttributeNames: {
            "#type": "type",
            "#start": "start",
            "#end": "end",
          },
        };
        return new QueryCommand(params);
      case "create":
        params = {
          ...baseParams,
          Item: event,
        };
        return new PutCommand(params);
      case "update":
        params = {
          ...baseParams,
          Key: {
            id: event.id,
          },
          UpdateExpression: "set #start = :start, #end = :end, title = :title",
          ExpressionAttributeValues: {
            ":start": event.start,
            ":end": event.end,
            ":title": event.title,
          },
          ExpressionAttributeNames: {
            "#start": "start",
            "#end": "end",
          },
        };
        return new UpdateCommand(params);
      case "get":
        params = {
          ...baseParams,
          Key: {
            id: event.id,
          },
        };
        return new GetCommand(params);
      case "remove":
        params = {
          ...baseParams,
          Key: {
            id: event.id,
          },
        };
        return new DeleteCommand(params);
      case "checkOverlaps":
        params = {
          ...baseParams,
          IndexName: "type-end-index",
          KeyConditionExpression: "#type = :type AND #end > :start",
          FilterExpression: "#start < :end AND #id <> :id",
          ExpressionAttributeValues: {
            ":type": "event",
            ":start": dayjs(event.start).add(1, "day").format("YYYY-MM-DD"),
            ":end": dayjs(event.end).add(-1, "day").format("YYYY-MM-DD"),
            ":id": event.id,
          },
          ExpressionAttributeNames: {
            "#type": "type",
            "#start": "start",
            "#end": "end",
            "#id": "id",
          },
        };
        return new QueryCommand(params);
    }
    throw new Error("#getDbCommand: Invalid method: " + method);
  }
}
