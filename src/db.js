"use strict";

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { GetCommand, DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const dynClient = new DynamoDBClient({});
const client = DynamoDBDocumentClient.from(dynClient);

const initDB = async () => {
  const params = {
    TableName: process.env.EVENTS_TABLE,
    Key: {
      id: "XXX",
    },
  };
  await client.send(new GetCommand(params));
};

exports.dbInitPromise = initDB();
exports.client = client;
