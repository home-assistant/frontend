import webpack from "../build-scripts/webpack.cjs";

const config = webpack.createAppConfig({
  isProdBuild: false,
  latestBuild: true,
  isStatsBuild: false,
  isTestBuild: true,
});

// instant-mocha forces a CJS library, so cannot output ESM
config.output.module = false;

export default config;
