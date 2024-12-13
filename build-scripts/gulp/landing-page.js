import gulp from "gulp";
import "./clean.js";
import "./compress.js";
import "./entry-html.js";
import "./gather-static.js";
import "./gen-icons-json.js";
import "./translations.js";
import "./rspack.js";

gulp.task(
  "develop-landing-page",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-landing-page",
    "translations-enable-merge-backend",
    "build-landing-page-translations",
    "copy-translations-landing-page",
    "build-locale-data",
    "copy-static-landing-page",
    "gen-pages-landing-page-dev",
    "rspack-watch-landing-page"
  )
);

gulp.task(
  "build-landing-page",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-landing-page",
    "build-landing-page-translations",
    "copy-translations-landing-page",
    "build-locale-data",
    "copy-static-landing-page",
    "rspack-prod-landing-page",
    "gen-pages-landing-page-prod"
  )
);
