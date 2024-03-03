const path = require("path");

module.exports = {
  mode: "production", // "production" | "development" | "none"
  // devtool: "inline-source-map",
  entry: {
    index: {
      import: "./front/src/index.js",
      dependOn: "fullcalendar",
    },
    fullcalendar: "./front/src/fullcalendar.js",
    login: "./front/src/login.js",
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "./front/dist"),
  },
  /*
  optimization: {
    splitChunks: {
      chunks: "all",
    },
  },
  */
};
