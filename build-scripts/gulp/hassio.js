const gulp = require("gulp");
const fs = require("fs");
const path = require("path");

const env = require("../env");
const paths = require("../paths");

require("./clean.js");
require("./gen-icons-json.js");
require("./webpack.js");
require("./compress.js");
require("./rollup.js");
require("./gather-static.js");
require("./translations.js");

gulp.task(
  "develop-hassio",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-hassio",
    "gen-icons-json",
    "gen-index-hassio-dev",
    "build-supervisor-translations",
    "copy-translations-supervisor",
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
    "gen-icons-json",
    "build-supervisor-translations",
    "copy-translations-supervisor",
    env.useRollup() ? "rollup-prod-hassio" : "webpack-prod-hassio",
    "gen-index-hassio-prod",
    ...// Don't compress running tests
    (env.isTest() ? [] : ["compress-hassio"])
  )
);
