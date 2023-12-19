"use strict";

const handlerHelper = require("../handlerHelper");
const prices = require("../../prices.json");
const access = require("../accessControl");

const getPrices = async (event) => {
  access.authenticate(event);

  return {
    statusCode: 200,
    body: JSON.stringify(prices),
  };
};

exports.handler = handlerHelper.apiHandler(getPrices);
