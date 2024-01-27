import webpack from "../build-scripts/webpack.cjs";
import env from "../build-scripts/env.cjs";

export default webpack.createGalleryConfig({
  isProdBuild: env.isProdBuild(),
  isStatsBuild: env.isStatsBuild(),
  latestBuild: true,
});
