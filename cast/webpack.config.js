const {
  isProdBuild,
  createCastConfig,
} = require("../build-scripts/webpack.js");

// File just used for stats builds

const latestBuild = true;

module.exports = createCastConfig({
  isProdBuild,
  latestBuild,
});
