import cors from "@koa/cors";
import { rollupAdapter } from "@web/dev-server-rollup";
import rollup from "./build-scripts/rollup.cjs";

const rollupWDSPlugins = rollup
  .createAppConfig({
    latestBuild: true,
    isWDS: true,
  })
  .inputOptions.plugins.map((rollupPluginConf) =>
    rollupAdapter(rollupPluginConf, {}, {})
  );

/** @type import("@web/dev-server/src/config/DevServerConfig.ts") */
export default {
  mimeTypes: {
    "**/*.ts": "js",
    "**/*.json": "js",
    "**/*.css": "js",
  },
  middleware: [cors()],
  plugins: rollupWDSPlugins,
};
