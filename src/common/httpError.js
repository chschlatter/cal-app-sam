// @ts-check

export class HttpError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - error message
   * @param {Object} [details={}] - additional details
   */
  constructor(statusCode, message, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
  }
}
