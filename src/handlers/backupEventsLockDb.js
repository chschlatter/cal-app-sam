const { GetObjectCommand, S3Client } = require("@aws-sdk/client-s3");
import { Upload } from "@aws-sdk/lib-storage";
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  QueryCommand,
  DynamoDBDocumentClient,
} = require("@aws-sdk/lib-dynamodb");
const { EventsModelNoLock } = require("../model/events.model-DynNoLock");
const { Readable } = require("stream");

const { EVENTS_TABLE, BACKUP_BUCKET, API_TOKEN } = process.env;

const dbClient = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(dbClient);

exports.handler = async (event) => {
  if (event.path === "/api/events/backup") {
    return backup(event);
  } else if (event.path === "/api/events/restore") {
    return restore(event);
  }
};

class DbItemsForBackup extends Readable {
  #lastEvaluatedKey = null;
  _read(size) {
    const params = {
      TableName: EVENTS_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": "EVENT",
      },
    };
    if (this.#lastEvaluatedKey !== null) {
      params.ExclusiveStartKey = this.#lastEvaluatedKey;
    }
    const dbCmd = new QueryCommand(params);
    db.send(dbCmd)
      .then((data) => {
        this.#lastEvaluatedKey = data.LastEvaluatedKey;
        console.log("LastEvaluatedKey:", this.#lastEvaluatedKey);
        if (data.Items && data.Items.length > 0) {
          const jsonLines = data.Items.reduce((acc, item) => {
            // map to fullcalendar format, keep remaining fields
            item.start = item.startDate;
            item.end = item.endDate;
            delete item.startDate;
            delete item.endDate;
            acc.push(JSON.stringify(item) + "\n");
            return acc;
          }, []);
          this.push(jsonLines.join(""));
        }
        if (this.#lastEvaluatedKey === undefined) {
          this.push(null);
        }
      })
      .catch((error) => {
        console.error("Error during DynamoDB query:", error);
        this.emit("error", error); // Emit error event
        this.push(null);
      });
  }
}

class LogLinesFromRestore extends Readable {
  #items = [];
  #events = null;
  constructor(items) {
    super();
    this.#items = items;
    this.#events = new EventsModelNoLock();
  }
  _read(size) {
    if (this.#items.length > 0) {
      const item = this.#items.shift();
      this.#events
        .create({
          start: item.start,
          end: item.end,
          title: item.title,
        })
        .then(() => {
          const logObj = {
            action: "create",
            item,
          };
          this.push(JSON.stringify(logObj) + "\n");
        })
        .catch((error) => {
          console.error("Error restoring event:", error);
          const logObj = {
            action: "error",
            item,
            error: error.message,
          };
          this.push(JSON.stringify(logObj) + "\n");
        });
    } else {
      this.push(null);
    }
  }
}

const backup = async (event) => {
  const apiToken = event.headers["x-api-token"];
  if (apiToken !== API_TOKEN) {
    return {
      statusCode: 403,
      body: JSON.stringify({ message: "Forbidden" }),
    };
  }
  const timestamp = new Date().toISOString();
  const backupFileName = `backups/events-backup-${timestamp}.jsonl`;

  const upload = new Upload({
    client: new S3Client({}),
    params: {
      Bucket: BACKUP_BUCKET,
      Key: backupFileName,
      Body: new DbItemsForBackup(),
    },
  });
  upload.on("httpUploadProgress", (progress) => {
    console.log(progress);
  });

  upload.on("error", (error) => {
    console.error("Error during upload:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Backup failed", error: error.message }),
    };
  });

  const uploadResult = await upload.done();
  console.log("done uploading", uploadResult);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Backup successful", backupFileName }),
  };
};

const restore = async (event) => {
  const apiToken = event.headers["x-api-token"];
  if (apiToken !== API_TOKEN) {
    return {
      statusCode: 403,
      body: JSON.stringify({ message: "Forbidden" }),
    };
  }

  try {
    const backupFileName = event.queryStringParameters.fileName;
    const client = new S3Client({});
    const response = await client.send(
      new GetObjectCommand({
        Bucket: BACKUP_BUCKET,
        Key: backupFileName,
      })
    );
    const fileContent = await response.Body.transformToString();
    const backupData = fileContent.split("\n");
    const items = backupData.reduce((acc, line) => {
      try {
        const parsedLine = JSON.parse(line);
        acc.push(parsedLine);
      } catch (error) {
        console.info("Error parsing line:", error);
      }
      return acc;
    }, []);

    const writeLogs = new Upload({
      client: new S3Client({}),
      params: {
        Bucket: BACKUP_BUCKET,
        Key: `restore-logs/${backupFileName}`,
        Body: new LogLinesFromRestore(items),
      },
    });

    writeLogs.on("httpUploadProgress", (progress) => {
      console.log(progress);
    });

    const uploadResult = await writeLogs.done();
    console.log("done uploading restore logs", uploadResult);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Restore successful" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Restore failed", error: error.message }),
    };
  }
};
