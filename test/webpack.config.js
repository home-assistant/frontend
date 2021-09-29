const { createAppConfig } = require("../build-scripts/webpack.js");

module.exports = createAppConfig({
  isProdBuild: false,
  latestBuild: true,
  isStatsBuild: false,
});
