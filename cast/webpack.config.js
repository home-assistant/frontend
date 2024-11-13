import rspack from "../build-scripts/rspack.cjs";
import env from "../build-scripts/env.cjs";

export default rspack.createCastConfig({
  isProdBuild: env.isProdBuild(),
  isStatsBuild: env.isStatsBuild(),
  latestBuild: true,
});
