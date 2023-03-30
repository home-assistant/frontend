const gulp = require("gulp");
const env = require("../env.cjs");

require("./clean.cjs");
require("./translations.cjs");
require("./gather-static.cjs");
require("./webpack.cjs");
require("./service-worker.cjs");
require("./entry-html.cjs");
require("./rollup.cjs");

gulp.task(
  "develop-cast",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-cast",
    "translations-enable-merge-backend",
    gulp.parallel("gen-icons-json", "build-translations", "build-locale-data"),
    "copy-static-cast",
    "gen-index-cast-dev",
    env.useRollup() ? "rollup-dev-server-cast" : "webpack-dev-server-cast"
  )
);

gulp.task(
  "build-cast",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-cast",
    "translations-enable-merge-backend",
    gulp.parallel("gen-icons-json", "build-translations", "build-locale-data"),
    "copy-static-cast",
    env.useRollup() ? "rollup-prod-cast" : "webpack-prod-cast",
    "gen-index-cast-prod"
  )
);
