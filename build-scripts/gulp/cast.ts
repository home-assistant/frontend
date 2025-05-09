/* eslint-disable import/no-extraneous-dependencies */
import gulp from "gulp";
import "./clean.ts";
import "./entry-html.ts";
import "./gather-static.ts";
import "./rspack.ts";
import "./service-worker.ts";
import "./translations.ts";

gulp.task(
  "develop-cast",
  gulp.series(
    async () => {
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
    async () => {
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
