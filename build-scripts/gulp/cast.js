const gulp = require("gulp");

require("./clean.js");
require("./translations.js");
require("./gather-static.js");
require("./webpack.js");
require("./minify.js");
require("./service-worker.js");
require("./entry-html.js");

gulp.task(
  "develop-cast",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-cast",
    "translations-enable-merge-backend",
    gulp.parallel("gen-icons-json", "build-translations"),
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
    "translations-enable-merge-backend",
    gulp.parallel("gen-icons-json", "build-translations"),
    "copy-static-cast",
    "webpack-prod-cast",
    "minify-cast",
    "gen-index-cast-prod"
  )
);
