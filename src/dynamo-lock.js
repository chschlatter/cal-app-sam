"use strict";

//import { setTimeout } from "node:timers/promises";
const setTimeout = require("timers/promises").setTimeout;
const dayjs = require("dayjs");
const { PutCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const locksTable = process.env.LOCKS_TABLE;

/**
 *
 * @param {import("./db2").DB} db
 * @returns {Promise<Function>}
 */
const dynamoLock2 = async (db) => {
  return dynamoLock(await db.client, db.tableName);
};

const dynamoLock = async (dynamodbDocumentClient, resource) => {
  const lock = {
    resource: resource,
    Expiry: dayjs().add(30, "seconds").toISOString(),
  };

  let unlock = false;
  while (!unlock) {
    try {
      const params = {
        TableName: locksTable,
        Item: lock,
        ConditionExpression: "attribute_not_exists(#resource) OR Expiry < :now",
        ExpressionAttributeValues: {
          ":now": dayjs().toISOString(),
        },
        ExpressionAttributeNames: {
          "#resource": "resource",
        },
      };

      await dynamodbDocumentClient.send(new PutCommand(params));
      console.log("Lock acquired");
      unlock = async () => {
        await dynamoUnlock(dynamodbDocumentClient, resource);
      };
    } catch (err) {
      if (err.name === "ConditionalCheckFailedException") {
        console.log("Lock already acquired");
        await setTimeout(500);
      } else {
        throw err;
      }
    }
  }
  return unlock;
};

const dynamoUnlock = async (dynamodbDocumentClient, resource) => {
  const params = {
    TableName: locksTable,
    Key: {
      resource: resource,
    },
  };

  try {
    await dynamodbDocumentClient.send(new DeleteCommand(params));
    console.log("Lock released");
  } catch (err) {
    console.log("Lock not released");
    throw err;
  }
};

module.exports = { dynamoLock, dynamoLock2 };
