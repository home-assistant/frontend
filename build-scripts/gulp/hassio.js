const gulp = require("gulp");

const env = require("../env");

require("./clean.js");
require("./gen-icons-json.js");
require("./webpack.js");
require("./compress.js");
require("./rollup.js");

gulp.task(
  "develop-hassio",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-hassio",
    "gen-icons-json",
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
    env.useRollup() ? "rollup-prod-hassio" : "webpack-prod-hassio",
    ...// Don't compress running tests
    (env.isTest() ? [] : ["compress-hassio"])
  )
);
