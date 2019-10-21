const { createCastConfig } = require("../build-scripts/webpack.js");
const { isProdBuild } = require("../build-scripts/env.js");

// File just used for stats builds

const latestBuild = true;

module.exports = createCastConfig({
  isProdBuild,
  latestBuild,
});
