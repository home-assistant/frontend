const { createHassioConfig } = require("../build-scripts/webpack.js");
const { isProdBuild } = require("../build-scripts/env.js");

// File just used for stats builds

const latestBuild = false;

module.exports = createHassioConfig({
  isProdBuild: isProdBuild(),
  latestBuild,
});
