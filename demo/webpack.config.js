const { createDemoConfig } = require("../build-scripts/webpack.js");

// This file exists because we haven't migrated the stats script yet

const isProdBuild = process.env.NODE_ENV === "production";
const isStatsBuild = process.env.STATS === "1";
const latestBuild = false;

module.exports = createDemoConfig({
  isProdBuild,
  isStatsBuild,
  latestBuild,
});
