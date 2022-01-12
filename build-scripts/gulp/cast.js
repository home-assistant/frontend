const gulp = require("gulp");

const env = require("../env");

require("./clean.js");
require("./translations.js");
require("./gather-static.js");
require("./webpack.js");
require("./service-worker.js");
require("./entry-html.js");
require("./rollup.js");

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
