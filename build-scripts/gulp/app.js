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
      "gen-index-app-dev",
      gulp.series("create-test-translation", "build-translations")
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
    gulp.parallel(
      "webpack-prod-app",
      // Do not compress static files in CI, it's SLOW.
      ...(process.env.CI === "true" ? [] : ["compress-static"])
    ),
    gulp.parallel(
      "gen-pages-prod",
      "gen-index-app-prod",
      "gen-service-worker-prod"
    )
  )
);
