// @ts-check

/**
 *
 * @param {string} name
 * @returns {string}
 */
const getSecret = (name) => {
  if (process.env[name]) {
    return String(process.env[name]);
  } else {
    throw new Error(`Missing secret ${name}`);
  }
};

module.exports = {
  getSecret,
};
