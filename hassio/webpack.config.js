const { createHassioConfig } = require("../build-scripts/webpack.js");
const { isProdBuild, isStatsBuild } = require("../build-scripts/env.js");

module.exports = createHassioConfig({
  isProdBuild: isProdBuild(),
  isStatsBuild: isStatsBuild(),
  latestBuild: true,
});
