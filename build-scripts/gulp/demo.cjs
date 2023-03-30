// Run demo develop mode
const gulp = require("gulp");
const env = require("../env.cjs");

require("./clean.cjs");
require("./translations.cjs");
require("./gen-icons-json.cjs");
require("./gather-static.cjs");
require("./webpack.cjs");
require("./service-worker.cjs");
require("./entry-html.cjs");
require("./rollup.cjs");

gulp.task(
  "develop-demo",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-demo",
    "translations-enable-merge-backend",
    gulp.parallel(
      "gen-icons-json",
      "gen-index-demo-dev",
      "build-translations",
      "build-locale-data"
    ),
    "copy-static-demo",
    env.useRollup() ? "rollup-dev-server-demo" : "webpack-dev-server-demo"
  )
);

gulp.task(
  "build-demo",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-demo",
    // Cast needs to be backwards compatible and older HA has no translations
    "translations-enable-merge-backend",
    gulp.parallel("gen-icons-json", "build-translations", "build-locale-data"),
    "copy-static-demo",
    env.useRollup() ? "rollup-prod-demo" : "webpack-prod-demo",
    "gen-index-demo-prod"
  )
);
