const {
  isProdBuild,
  isStatsBuild,
  createDemoConfig,
} = require("../build-scripts/webpack.js");

// File just used for stats builds

const latestBuild = true;

module.exports = createDemoConfig({
  isProdBuild,
  isStatsBuild,
  latestBuild,
});
