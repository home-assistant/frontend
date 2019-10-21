const { createAppConfig } = require("./build-scripts/webpack.js");
const { isProdBuild, isStatsBuild } = require("./build-scripts/env.js");

// This file exists because we haven't migrated the stats script yet

const configs = [
  createAppConfig({
    isProdBuild,
    isStatsBuild,
    latestBuild: true,
  }),
];
// const configs = [createConfig(isProdBuild, /* latestBuild */ true)];
if (isProdBuild && !isStatsBuild) {
  configs.push(
    createAppConfig({
      isProdBuild,
      isStatsBuild,
      latestBuild: false,
    })
  );
}

module.exports = configs;
