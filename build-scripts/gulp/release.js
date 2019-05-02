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
  "build-release",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean",
    gulp.parallel(
      "copy-static",
      "gen-icons",
      gulp.series("build-translations", "copy-translations")
    ),
    gulp.parallel("webpack-prod", "compress-static"),
    gulp.parallel(
      "gen-pages-prod",
      "gen-index-html-prod",
      "gen-service-worker-prod"
    )
  )
);
