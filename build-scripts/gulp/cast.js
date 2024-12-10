import gulp from "gulp";
import "./clean.js";
import "./entry-html.js";
import "./gather-static.js";
import "./service-worker.js";
import "./translations.js";
import "./rspack.js";

gulp.task(
  "develop-cast",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-cast",
    "translations-enable-merge-backend",
    gulp.parallel("gen-icons-json", "build-translations", "build-locale-data"),
    "copy-static-cast",
    "gen-pages-cast-dev",
    "rspack-dev-server-cast"
  )
);

gulp.task(
  "build-cast",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-cast",
    "translations-enable-merge-backend",
    gulp.parallel("gen-icons-json", "build-translations", "build-locale-data"),
    "copy-static-cast",
    "rspack-prod-cast",
    "gen-pages-cast-prod"
  )
);
