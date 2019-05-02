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
  "develop",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean",
    gulp.parallel(
      "copy-static",
      "gen-service-worker-dev",
      "gen-icons",
      "gen-pages-dev",
      "gen-index-html-dev",
      gulp.series("build-translations", "copy-translations")
    ),
    "webpack-watch"
  )
);
