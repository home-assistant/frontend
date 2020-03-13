const gulp = require("gulp");

const envVars = require("../env");

require("./clean.js");
require("./gen-icons.js");
require("./webpack.js");
require("./compress.js");

gulp.task(
  "develop-hassio",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-hassio",
    gulp.parallel("gen-icons-hassio", "gen-icons-mdi"),
    "webpack-watch-hassio"
  )
);

gulp.task(
  "build-hassio",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-hassio",
    gulp.parallel("gen-icons-hassio", "gen-icons-mdi"),
    "webpack-prod-hassio",
    ...// Don't compress running tests
    (envVars.isTravis() ? [] : ["compress-hassio"])
  )
);
