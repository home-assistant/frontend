import rollup from "../build-scripts/rollup.cjs";
import env from "../build-scripts/env.cjs";

const config = rollup.createCastConfig({
  isProdBuild: env.isProdBuild(),
  latestBuild: true,
  isStatsBuild: env.isStatsBuild(),
});

export default { ...config.inputOptions, output: config.outputOptions };
