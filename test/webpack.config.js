import webpack from "../build-scripts/webpack.cjs";

const config = webpack.createAppConfig({
  isProdBuild: false,
  latestBuild: true,
  isStatsBuild: false,
  isTestBuild: false,
});

// instant-mocha overrides output filename to "main.js",
// so we need to turn off runtime chunk to avoid a Webpack error
config.optimization.runtimeChunk = undefined;

export default config;
