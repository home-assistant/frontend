import gulp from "gulp";
import "./clean.js";
import "./entry-html.js";
import "./gather-static.js";
import "./gen-icons-json.js";
import "./rollup.js";
import "./service-worker.js";
import "./translations.js";
import "./webpack.js";

gulp.task(
  "develop-landing-page",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-landing-page",
    "translations-enable-merge-backend",
    gulp.parallel("gen-icons-json", "build-translations", "build-locale-data"),
    "copy-static-landing-page",
    "gen-pages-landing-page-dev",
    gulp.parallel("webpack-watch-landing-page")
  )
);

gulp.task(
  "build-landing-page",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-landing-page",
    "translations-enable-merge-backend",
    gulp.parallel("gen-icons-json", "build-translations", "build-locale-data"),
    "copy-static-landing-page",
    "webpack-prod-landing-page",
    "gen-pages-landing-page-prod"
  )
);
