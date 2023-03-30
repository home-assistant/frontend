import webpack from "../build-scripts/webpack.cjs";
import env from "../build-scripts/env.cjs";

export default webpack.createCastConfig({
  isProdBuild: env.isProdBuild(),
  isStatsBuild: env.isStatsBuild(),
  latestBuild: true,
});
