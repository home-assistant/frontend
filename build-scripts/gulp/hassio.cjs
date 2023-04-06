const gulp = require("gulp");
const env = require("../env.cjs");
require("./clean.cjs");
require("./compress.cjs");
require("./entry-html.cjs");
require("./gather-static.cjs");
require("./gen-icons-json.cjs");
require("./rollup.cjs");
require("./translations.cjs");
require("./webpack.cjs");

gulp.task(
  "develop-hassio",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-hassio",
    "gen-dummy-icons-json",
    "gen-index-hassio-dev",
    "build-supervisor-translations",
    "copy-translations-supervisor",
    "build-locale-data",
    "copy-locale-data-supervisor",
    env.useRollup() ? "rollup-watch-hassio" : "webpack-watch-hassio"
  )
);

gulp.task(
  "build-hassio",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-hassio",
    "gen-dummy-icons-json",
    "build-supervisor-translations",
    "copy-translations-supervisor",
    "build-locale-data",
    "copy-locale-data-supervisor",
    env.useRollup() ? "rollup-prod-hassio" : "webpack-prod-hassio",
    "gen-index-hassio-prod",
    ...// Don't compress running tests
    (env.isTestBuild() ? [] : ["compress-hassio"])
  )
);
