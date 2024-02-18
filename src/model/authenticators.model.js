"use strict";

const {
  GetCommand,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

class Authenticators {
  #ddClient;
  #tableName;

  constructor(dynDocClient, tableName) {
    this.#ddClient = dynDocClient;
    this.#tableName = tableName;
  }

  async saveNewUserAuthenticator(userName, registrationInfo, transports) {
    const authenticator = {
      // credentialID: btoa(registrationInfo.credentialID),
      // credentialPublicKey: btoa(registrationInfo.credentialPublicKey),
      credentialID: registrationInfo.credentialID,
      credentialPublicKey: registrationInfo.credentialPublicKey,
      counter: registrationInfo.counter,
      credentialDeviceType: registrationInfo.credentialDeviceType,
      credentialBackedUp: registrationInfo.credentialBackedUp,
      transports: transports,
    };

    const params = {
      TableName: this.#tableName,
      Item: {
        userName: userName,
        credentialID: authenticator.credentialID,
        authenticator: authenticator,
      },
    };

    await this.#ddClient.send(new PutCommand(params));
  }

  static async init(db, tableName) {
    await db.dbInitPromise;
    return new Authenticators(db.client, tableName);
  }
}

module.exports = { Authenticators };
