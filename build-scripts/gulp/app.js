// Run HA develop mode
const gulp = require("gulp");

const env = require("../env");

require("./clean.js");
require("./translations.js");
require("./locale-data.js");
require("./gen-icons-json.js");
require("./gather-static.js");
require("./compress.js");
require("./webpack.js");
require("./service-worker.js");
require("./entry-html.js");
require("./rollup.js");
require("./wds.js");

gulp.task(
  "develop-app",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean",
    gulp.parallel(
      "gen-service-worker-app-dev",
      "gen-icons-json",
      "gen-pages-dev",
      "gen-index-app-dev",
      "build-translations",
      "build-locale-data"
    ),
    "copy-static-app",
    env.useWDS()
      ? "wds-watch-app"
      : env.useRollup()
      ? "rollup-watch-app"
      : "webpack-watch-app"
  )
);

gulp.task(
  "build-app",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean",
    gulp.parallel("gen-icons-json", "build-translations", "build-locale-data"),
    "copy-static-app",
    env.useRollup() ? "rollup-prod-app" : "webpack-prod-app",
    // Don't compress running tests
    ...(env.isTest() ? [] : ["compress-app"]),
    gulp.parallel(
      "gen-pages-prod",
      "gen-index-app-prod",
      "gen-service-worker-app-prod"
    )
  )
);
