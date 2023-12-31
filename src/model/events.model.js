"use strict";

const createError = require("http-errors");
const {
  GetCommand,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const dynamoLock = require("../dynamo-lock").dynamoLock;
const { v4: uuidv4 } = require("uuid");
const dayjs = require("dayjs");
const users = require("../../users.json");

const list = async (start, end, dynDocClient, tableName) => {
  if (!start || !end) {
    throw new Error("Please provide start and end query params");
  }

  const params = {
    TableName: tableName,
    IndexName: "type-end-index",
    KeyConditionExpression: "#type = :type AND #end >= :start",
    FilterExpression: "#start <= :end",
    ExpressionAttributeValues: {
      ":type": "event",
      ":start": start,
      ":end": end,
    },
    ExpressionAttributeNames: {
      "#type": "type",
      "#start": "start",
      "#end": "end",
    },
  };
  const data = await dynDocClient.send(new QueryCommand(params));
  return data.Items.map((item) => {
    item.color = users[item.title] ? users[item.title].color : "blue";
    return item;
  });
};

const create = async (event, dynDocClient, tableName) => {
  // lock cal_events table
  const unlock = await dynamoLock(dynDocClient, tableName);

  try {
    // check if event overlaps with another
    await checkOverlaps(event, dynDocClient, tableName);

    event.id = uuidv4();
    event.type = "event";
    const params = {
      TableName: tableName,
      Item: event,
    };
    await dynDocClient.send(new PutCommand(params));
  } finally {
    // unlock cal_events table
    await unlock();
  }
  return event;
};

const checkOverlaps = async (event, dynDocClient, tableName) => {
  const params = {
    TableName: tableName,
    IndexName: "type-end-index",
    KeyConditionExpression: "#type = :type AND #end > :start",
    FilterExpression: "#start < :end",
    ExpressionAttributeValues: {
      ":type": "event",
      ":start": dayjs(event.start).add(1, "day").format("YYYY-MM-DD"),
      ":end": dayjs(event.end).add(-1, "day").format("YYYY-MM-DD"),
    },
    ExpressionAttributeNames: {
      "#type": "type",
      "#start": "start",
      "#end": "end",
    },
  };

  const data = await dynDocClient.send(new QueryCommand(params));

  // throw http error if event overlaps with another
  if (data.Count > 0) {
    let errorData = {
      overlap_start: false,
      overlap_end: false,
    };

    data.Items.forEach((item) => {
      if (item.id === event.id) {
        return;
      }
      if (event.start >= item.start) {
        errorData.overlap_start = true;
      }
      if (event.end <= item.end) {
        errorData.overlap_end = true;
      }
    });

    if (errorData.overlap_start || errorData.overlap_end) {
      throw new createError(409, "Event overlaps with another", errorData);
    }
  }
};

const update = async (event, dynDocClient, tableName) => {
  const params = {
    TableName: tableName,
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

  // lock cal_events table
  const unlock = await dynamoLock(dynDocClient, tableName);
  try {
    // check if event overlaps with another
    await checkOverlaps(event, dynDocClient, tableName);
    // update event
    try {
      await dynDocClient.send(new UpdateCommand(params));
    } catch (err) {
      if (err.code === "ResourceNotFoundException") {
        throw new createError(404, "Event not found");
      } else {
        throw err;
      }
    }
  } finally {
    // unlock cal_data table
    await unlock();
  }
  return event;
};

const remove = async (eventId, dynDocClient, tableName) => {
  const params = {
    TableName: tableName,
    Key: {
      id: eventId,
    },
  };

  try {
    await dynDocClient.send(new DeleteCommand(params));
  } catch (err) {
    if (err.code === "ResourceNotFoundException") {
      throw new createError(404, "Event not found");
    } else {
      throw err;
    }
  }
};

const get = async (eventId, dynDocClient, tableName) => {
  const params = {
    TableName: tableName,
    Key: {
      id: eventId,
    },
  };

  const data = await dynDocClient.send(new GetCommand(params));
  if (!data.Item) {
    throw new createError(404, "Event not found");
  }
  return data.Item;
};

module.exports = {
  list,
  create,
  update,
  get,
  remove,
};
