const gulp = require("gulp");

require("./clean.js");
require("./translations.js");
require("./gen-icons.js");
require("./gather-static.js");
require("./webpack.js");
require("./service-worker.js");
require("./entry-html.js");

gulp.task(
  "develop-cast",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-cast",
    gulp.parallel(
      "gen-icons-app",
      "gen-icons-mdi",
      "gen-index-cast-dev",
      "build-translations"
    ),
    "copy-static-cast",
    "webpack-dev-server-cast"
  )
);

gulp.task(
  "build-cast",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-cast",
    gulp.parallel("gen-icons-app", "gen-icons-mdi", "build-translations"),
    "copy-static-cast",
    "webpack-prod-cast",
    "gen-index-cast-prod"
  )
);
