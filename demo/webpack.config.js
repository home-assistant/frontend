import rspack from "../build-scripts/rspack.cjs";
import env from "../build-scripts/env.cjs";

// File just used for stats builds
const latestBuild = true;

export default rspack.createDemoConfig({
  isProdBuild: env.isProdBuild(),
  isStatsBuild: env.isStatsBuild(),
  latestBuild,
});
