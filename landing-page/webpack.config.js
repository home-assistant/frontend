import webpack from "../build-scripts/webpack.cjs";
import env from "../build-scripts/env.cjs";

export default webpack.createLandingPageConfig({
  isProdBuild: env.isProdBuild(),
  isStatsBuild: env.isStatsBuild(),
  latestBuild: true,
});
