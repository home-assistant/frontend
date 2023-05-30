import webpack from "../build-scripts/webpack.cjs";

export default webpack.createAppConfig({
  isProdBuild: false,
  latestBuild: true,
  isStatsBuild: false,
  isTestBuild: true,
});
