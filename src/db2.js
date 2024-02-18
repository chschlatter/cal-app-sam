// @ts-check

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { GetCommand, DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

/**
 * @typedef {import("@aws-sdk/lib-dynamodb").GetCommandOutput} GetCommandOutput
 */

class DB {
  /**
   * @type {DynamoDBDocumentClient}
   */
  #client;

  /**
   * @type {string}
   */
  #tableName;

  /**
   * @type {Promise<GetCommandOutput>}
   */
  #initPromise;

  /**
   * @type {boolean}
   */
  #initComplete = false;

  /**
   * initialize DB with connnection to DynamoDB
   * to be called in lambda initialization code
   * @param {string} tableName
   */
  constructor(tableName) {
    const dynClient = new DynamoDBClient({});
    this.#client = DynamoDBDocumentClient.from(dynClient);
    this.#tableName = tableName;

    const params = {
      TableName: this.#tableName,
      Key: {
        id: "XXX",
      },
    };
    this.#initPromise = this.#client.send(new GetCommand(params));
  }

  /**
   * @returns {Promise<DynamoDBDocumentClient>}
   */
  get client() {
    if (this.#initComplete) {
      return Promise.resolve(this.#client);
    }

    return (async () => {
      await this.#initPromise;
      this.#initComplete = true;
      return this.#client;
    })();
  }

  /**
   * @returns {string}
   */
  get tableName() {
    return this.#tableName;
  }
}

/**
 * @param {string} tableName
 * @returns {DB}
 */
function initDB(tableName) {
  return new DB(tableName);
}

module.exports = { DB, initDB };
