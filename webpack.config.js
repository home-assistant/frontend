const { createAppConfig } = require("./build-scripts/webpack.js");

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
