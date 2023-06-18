import webpack from "../build-scripts/webpack.cjs";
import env from "../build-scripts/env.cjs";

// File just used for stats builds
const latestBuild = true;

export default webpack.createDemoConfig({
  isProdBuild: env.isProdBuild(),
  isStatsBuild: env.isStatsBuild(),
  latestBuild,
});
