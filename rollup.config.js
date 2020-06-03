const rollup = require("./build-scripts/rollup.js");
const env = require("./build-scripts/env.js");

const config = rollup.createAppConfig({
  isProdBuild: env.isProdBuild(),
  latestBuild: true,
  isStatsBuild: env.isStatsBuild(),
});

module.exports = { ...config.inputOptions, output: config.outputOptions };
