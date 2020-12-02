const cors = require("@koa/cors");
const { rollupAdapter } = require("@web/dev-server-rollup");

const rollup = require("./build-scripts/rollup");

const rollupWDSPlugins = rollup
  .createAppConfig({
    latestBuild: true,
    isWDS: true,
  })
  .inputOptions.plugins.map((rollupPluginConf) =>
    rollupAdapter(rollupPluginConf, {}, {})
  );

/** @type import("@web/dev-server/src/config/DevServerConfig.ts") */
module.exports = {
  mimeTypes: {
    "**/*.ts": "js",
    "**/*.json": "js",
    "**/*.css": "js",
  },
  middleware: [cors()],
  plugins: rollupWDSPlugins,
};
