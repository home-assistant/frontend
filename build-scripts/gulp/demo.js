// Run demo develop mode
const gulp = require("gulp");

require("./clean.js");
require("./translations.js");
require("./gen-icons.js");
require("./gather-static.js");
require("./webpack.js");
require("./service-worker.js");
require("./entry-html.js");

gulp.task(
  "develop-demo",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-demo",
    "translations-enable-merge-backend",
    gulp.parallel(
      "gen-icons-app",
      "gen-icons-mdi",
      "gen-icons-demo",
      "gen-index-demo-dev",
      "build-translations"
    ),
    "copy-static-demo",
    "webpack-dev-server-demo"
  )
);

gulp.task(
  "build-demo",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-demo",
    // Cast needs to be backwards compatible and older HA has no translations
    "translations-enable-merge-backend",
    gulp.parallel(
      "gen-icons-app",
      "gen-icons-mdi",
      "gen-icons-demo",
      "build-translations"
    ),
    "copy-static-demo",
    "webpack-prod-demo",
    "gen-index-demo-prod"
  )
);
