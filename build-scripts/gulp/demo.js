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
  "develop-demo",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-demo",
    gulp.parallel("gen-icons", "gen-icons-demo", "build-translations"),
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
    gulp.parallel("gen-icons", "gen-icons-demo", "build-translations"),
    "copy-static-demo",
    "webpack-prod-demo"
  )
);
