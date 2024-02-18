"use strict";

const db = require("../db2").initDB(process.env.WEBAUTHN_TABLE);
const { WebauthnModel } = require("../model/webauthn.model");
const users = require("../../users.json");
const handlerHelper = require("../handlerHelper");
const createError = require("http-errors");
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");
const access = require("../accessControl");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const { createSessionCookie } = require("../cookieAuth");
const { getSecret } = require("../secrets");

const rpName = "kalender.schlatter.net";
const rpID = "kalender.schlatter.net";
const rpOrigin = "https://kalender.schlatter.net";

const webauthnHandler = async (event) => {
  switch (event.path) {
    case "/api/webauthn/register":
      return registerHandler(event);
    case "/api/webauthn/authenticate":
      return authenticateHandler(event);
    default:
      throw new createError.BadRequest("Wrong path");
  }
};

const registerHandler = async (event) => {
  switch (event.httpMethod) {
    case "GET":
      return getRegisterHandler(event);
    case "POST":
      return postRegisterHandler(event);
    default:
      throw new createError.BadRequest("Wrong method");
  }
};

const getRegisterHandler = async (event) => {
  // only authenticated admins can register their tokens
  const { name: userName } = access.authenticate(event, {
    role: "admin",
  });

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: userName,
    userName: userName,
    attestationType: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "preferred",
      residentKey: "preferred",
    },
    timeout: 60000,
  });

  return await getOptionsResponse(options);
};

const postRegisterHandler = async (event) => {
  const body = JSON.parse(event.body);
  const webauthnModel = new WebauthnModel(db);
  const challengeID = getChallengeIDfromCookies(event);
  const expectedChallenge = await webauthnModel.getChallenge(challengeID);
  console.log("expectedChallenge", expectedChallenge);

  const verifyResponse = await verifyRegistrationResponse({
    response: body,
    expectedChallenge: expectedChallenge,
    expectedOrigin: rpOrigin,
    expectedRPID: rpID,
  });
  const { verified } = verifyResponse;

  await webauthnModel.deleteChallenge(challengeID);
  await webauthnModel.saveNewAuthenticator(
    verifyResponse.registrationInfo,
    body.response.transports
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ verified }),
  };
};

const authenticateHandler = async (event) => {
  switch (event.httpMethod) {
    case "GET":
      return getAuthenticateHandler(event);
    case "POST":
      return postAuthenticateHandler(event);
    default:
      throw new createError.BadRequest("Wrong method");
  }
};

const getAuthenticateHandler = async (event) => {
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: [],
    userVerification: "preferred",
  });

  return await getOptionsResponse(options);
};

const postAuthenticateHandler = async (event) => {
  const body = JSON.parse(event.body);
  console.log("postAuthenticateHandler() body", body);
  // const webauthnModel = await WebauthnModel.init(db);
  const challengeID = getChallengeIDfromCookies(event);
  const webauthnModel = new WebauthnModel(db);
  const expectedChallenge = await webauthnModel.getChallenge(challengeID);
  // credential ID (body.id) is base64url encoded
  const authenticator = await webauthnModel.getAuthenticator(body.id);
  console.log("postAuthenticateHandler() authenticator", authenticator);

  const toVerify = {
    response: body,
    expectedChallenge: expectedChallenge,
    expectedOrigin: rpOrigin,
    expectedRPID: rpID,
    authenticator: authenticator,
  };
  const verifyResponse = await verifyAuthenticationResponse(toVerify);
  console.log("postAuthenticateHandler() verifyResponse", verifyResponse);
  const { verified } = verifyResponse;

  await webauthnModel.deleteChallenge(challengeID);

  const userName = body.response.userHandle;
  const user = users[userName];
  // check is user is in users.json and has role admin
  if (user?.role !== "admin") {
    throw new createError.Forbidden("Only admins can login");
  }

  const sessionCookie = createSessionCookie(userName, user.role);
  return {
    statusCode: 200,
    body: JSON.stringify({
      name: userName,
      role: user.role,
      color: user.color,
    }),
    headers: {
      "Set-Cookie": sessionCookie,
    },
  };
};

exports.handler = handlerHelper.apiHandler(webauthnHandler);

// return webauthn options to the client, and add session cookie with challenge ID as jwt
const getOptionsResponse = async (options) => {
  //const webauthnModel = await WebauthnModel.init(db);
  const webauthnModel = new WebauthnModel(db);
  const challengeID = await webauthnModel.setCurrentChallenge(
    options.challenge
  );

  const token = jwt.sign(
    {
      challengeID,
    },
    getSecret("JWT_SECRET"),
    { expiresIn: "5m" }
  );
  return {
    statusCode: 200,
    body: JSON.stringify(options),
    headers: {
      "Set-Cookie": cookie.serialize("registerChallengeID", token, {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
      }),
    },
  };
};

// get challenge ID from cookies with included jwt
const getChallengeIDfromCookies = (event) => {
  try {
    const { registerChallengeID } = cookie.parse(event.headers["Cookie"]);
    if (!registerChallengeID) throw new Error("Missing cookie");
    const decoded = jwt.verify(registerChallengeID, getSecret("JWT_SECRET"));
    if (!decoded.challengeID) throw new Error("Missing challenge ID");
    return decoded.challengeID;
  } catch (err) {
    throw new createError.BadRequest(err.message);
  }
};
