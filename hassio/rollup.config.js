import rollup from "../build-scripts/rollup.cjs";
import env from "../build-scripts/env.cjs";

const config = rollup.createHassioConfig({
  isProdBuild: env.isProdBuild(),
  latestBuild: false,
  isStatsBuild: env.isStatsBuild(),
});

export default { ...config.inputOptions, output: config.outputOptions };
