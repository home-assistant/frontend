const rollup = require("../build-scripts/rollup.js");
const env = require("../build-scripts/env.js");

const config = rollup.createHassioConfig({
  isProdBuild: env.isProdBuild(),
  latestBuild: false,
  isStatsBuild: env.isStatsBuild(),
});

module.exports = { ...config.inputOptions, output: config.outputOptions };
