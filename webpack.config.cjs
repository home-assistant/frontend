/* eslint-disable @typescript-eslint/no-var-requires */
// Needs to remain CommonJS until eslint-import-resolver-webpack supports ES modules
const webpack = require("./build-scripts/webpack.cjs");
const env = require("./build-scripts/env.cjs");

// This file exists because we haven't migrated the stats script yet

const configs = [
  webpack.createAppConfig({
    isProdBuild: env.isProdBuild(),
    isStatsBuild: env.isStatsBuild(),
    isTestBuild: env.isTestBuild(),
    latestBuild: true,
  }),
];

if (env.isProdBuild() && !env.isStatsBuild()) {
  configs.push(
    webpack.createAppConfig({
      isProdBuild: env.isProdBuild(),
      isStatsBuild: env.isStatsBuild(),
      isTestBuild: env.isTestBuild(),
      latestBuild: false,
    })
  );
}

module.exports = configs;
