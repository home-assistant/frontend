// Run demo develop mode
const gulp = require("gulp");

require("./clean.js");
require("./translations.js");
require("./gen-icons-json.js");
require("./gather-static.js");
require("./webpack.js");
require("./minify.js");
require("./service-worker.js");
require("./entry-html.js");

gulp.task(
  "develop-gallery",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-gallery",
    "translations-enable-merge-backend",
    gulp.parallel("gen-icons-json", "build-translations"),
    "copy-static-gallery",
    "gen-index-gallery-dev",
    "webpack-dev-server-gallery"
  )
);

gulp.task(
  "build-gallery",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-gallery",
    "translations-enable-merge-backend",
    gulp.parallel("gen-icons-json", "build-translations"),
    "copy-static-gallery",
    "webpack-prod-gallery",
    "minify-gallery",
    "gen-index-gallery-prod"
  )
);
