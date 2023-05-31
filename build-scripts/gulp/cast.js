import gulp from "gulp";
import env from "../env.cjs";
import "./clean.js";
import "./entry-html.js";
import "./gather-static.js";
import "./rollup.js";
import "./service-worker.js";
import "./translations.js";
import "./webpack.js";

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
    env.useRollup() ? "rollup-dev-server-cast" : "webpack-dev-server-cast"
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
    env.useRollup() ? "rollup-prod-cast" : "webpack-prod-cast",
    "gen-pages-cast-prod"
  )
);
