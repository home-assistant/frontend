const {
  isProdBuild,
  createHassioConfig,
} = require("../build-scripts/webpack.js");

// File just used for stats builds

const latestBuild = false;

module.exports = createHassioConfig({
  isProdBuild,
  latestBuild,
});
