const { createCastConfig } = require("../build-scripts/webpack.js");
const { isProdBuild, isStatsBuild } = require("../build-scripts/env.js");

module.exports = createCastConfig({
  isProdBuild: isProdBuild(),
  isStatsBuild: isStatsBuild(),
  latestBuild: true,
});
