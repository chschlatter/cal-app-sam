// @ts-check

const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const uuid = require("uuid");
const { getSecret } = require("./secrets");

/**
 * @typedef {Object} JwtPayload
 * @extends {jwt.JwtPayload}
 * @property {string} name
 * @property {string} role
 */

/**
 * function to create a session cookie
 * @param {string} userName - the user name
 * @param {string} userRole - the user role
 * @param {boolean} stayLoggedIn - whether the session should be kept alive
 * @returns {string} the session cookie
 */
exports.createSessionCookie = (userName, userRole, stayLoggedIn = false) => {
  const tokenExpiresIn = stayLoggedIn ? "300d" : "1h";
  const maxAge = stayLoggedIn ? 300 * 24 * 3600 : 0;

  /**
   * @type {JwtPayload}
   */
  const payload = {
    name: userName,
    role: userRole,
  };

  const accessToken = jwt.sign(payload, getSecret("JWT_SECRET"), {
    expiresIn: tokenExpiresIn,
  });

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/api",
  };
  maxAge > 0 && (cookieOptions.maxAge = maxAge);

  return cookie.serialize("access_token", accessToken, cookieOptions);
};

/**
 * @param {import("aws-lambda").APIGatewayProxyEvent} apiEvent
 * @returns {JwtPayload}
 */
exports.parseSessionCookie = (apiEvent) => {
  const { access_token: accessToken } = cookie.parse(
    apiEvent.headers["Cookie"] ?? ""
  );
  const parsedToken = jwt.verify(accessToken, getSecret("JWT_SECRET"));
  if (typeof parsedToken === "object") {
    console.log("parsed cookie: ", parsedToken);
    return parsedToken;
  } else {
    throw new Error("Invalid token");
  }
};
