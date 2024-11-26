/* eslint-disable @typescript-eslint/no-var-requires */
// Needs to remain CommonJS until eslint-import-resolver-webpack supports ES modules
const rspack = require("./build-scripts/rspack.cjs");
const env = require("./build-scripts/env.cjs");

// This file exists because we haven't migrated the stats script yet

const configs = [
  rspack.createAppConfig({
    isProdBuild: env.isProdBuild(),
    isStatsBuild: env.isStatsBuild(),
    isTestBuild: env.isTestBuild(),
    latestBuild: true,
  }),
];

if (env.isProdBuild() && !env.isStatsBuild()) {
  configs.push(
    rspack.createAppConfig({
      isProdBuild: env.isProdBuild(),
      isStatsBuild: env.isStatsBuild(),
      isTestBuild: env.isTestBuild(),
      latestBuild: false,
    })
  );
}

module.exports = configs;
