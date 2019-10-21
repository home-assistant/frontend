const { createDemoConfig } = require("../build-scripts/webpack.js");
const { isProdBuild, isStatsBuild } = require("../build-scripts/env.js");

// File just used for stats builds

const latestBuild = true;

module.exports = createDemoConfig({
  isProdBuild,
  isStatsBuild,
  latestBuild,
});
