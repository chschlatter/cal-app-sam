"use strict";

const {
  GetCommand,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const dayjs = require("dayjs");
const uuid = require("uuid");
const { Buffer } = require("node:buffer");

export class WebauthnModel {
  #db;

  constructor(db) {
    this.#db = db;
  }

  async setCurrentChallenge(challenge) {
    const id = uuid.v4();
    // create challenge item in db
    const params = {
      TableName: this.#db.tableName,
      Item: {
        id: id,
        challenge: challenge,
      },
    };
    await (await this.#db.client).send(new PutCommand(params));
    return id;
  }

  async getChallenge(id) {
    const params = {
      TableName: this.#db.tableName,
      Key: {
        id: id,
      },
    };

    const data = await (await this.#db.client).send(new GetCommand(params));
    return data.Item?.challenge;
  }

  async deleteChallenge(id) {
    // delete challenge item from db
    const params = {
      TableName: this.#db.tableName,
      Key: {
        id: id,
      },
    };
    await (await this.#db.client).send(new DeleteCommand(params));
  }

  async saveNewAuthenticator(registrationInfo, transports) {
    const authenticator = {
      credentialID: registrationInfo.credentialID,
      credentialPublicKey: registrationInfo.credentialPublicKey,
      counter: registrationInfo.counter,
      credentialDeviceType: registrationInfo.credentialDeviceType,
      credentialBackedUp: registrationInfo.credentialBackedUp,
      transports: transports,
    };

    const params = {
      TableName: this.#db.tableName,
      Item: {
        id: Buffer.from(registrationInfo.credentialID).toString("base64url"),
        authenticator: authenticator,
      },
    };

    await (await this.#db.client).send(new PutCommand(params));
  }

  async getAuthenticator(id) {
    const params = {
      TableName: this.#db.tableName,
      Key: {
        id: id,
      },
    };

    const data = await (await this.#db.client).send(new GetCommand(params));
    return data.Item?.authenticator;
  }

  /*
  static async init(db) {
    await db.dbInitPromise;
    return new WebauthnModel(db);
  }
  */
}
