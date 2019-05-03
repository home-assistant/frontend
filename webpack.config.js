const { createAppConfig } = require("./build-scripts/webpack.js");

// This file exists because we haven't migrated the stats script yet

const isProdBuild = process.env.NODE_ENV === "production";
const isStatsBuild = process.env.STATS === "1";

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
