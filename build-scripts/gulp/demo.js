import gulp from "gulp";
import "./clean.js";
import "./entry-html.js";
import "./gather-static.js";
import "./gen-icons-json.js";
import "./service-worker.js";
import "./translations.js";
import "./webpack.js";

gulp.task(
  "develop-demo",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-demo",
    "translations-enable-merge-backend",
    gulp.parallel(
      "gen-icons-json",
      "gen-pages-demo-dev",
      "build-translations",
      "build-locale-data"
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
    gulp.parallel("gen-icons-json", "build-translations", "build-locale-data"),
    "copy-static-demo",
    "webpack-prod-demo",
    "gen-pages-demo-prod"
  )
);
