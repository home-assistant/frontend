// Run HA develop mode
const gulp = require("gulp");

require("./clean.js");
require("./translations.js");
require("./gen-icons.js");
require("./gather-static.js");
require("./webpack.js");
require("./service-worker.js");
require("./entry-html.js");

gulp.task(
  "develop-app",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean",
    gulp.parallel(
      "gen-service-worker-dev",
      "gen-icons",
      "gen-pages-dev",
      "gen-index-html-dev",
      "build-translations"
    ),
    "copy-static",
    "webpack-watch-app"
  )
);

gulp.task(
  "build-app",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean",
    gulp.parallel("gen-icons", "build-translations"),
    "copy-static",
    gulp.parallel("webpack-prod-app", "compress-static"),
    gulp.parallel(
      "gen-pages-prod",
      "gen-index-html-prod",
      "gen-service-worker-prod"
    )
  )
);
