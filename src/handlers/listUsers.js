"use strict";

const handlerHelper = require("../handlerHelper");
const users = require("../../users.json");
const access = require("../accessControl");

const listUsers = async (event) => {
  access.authenticate(event, { role: "admin" });

  const body = Object.entries(users).map(([name, user]) => {
    return {
      name: name,
      role: user.role,
      color: user.color,
    };
  });

  return {
    statusCode: 200,
    body: JSON.stringify(body),
  };
};

exports.handler = handlerHelper.apiHandler(listUsers);
