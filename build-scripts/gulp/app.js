import gulp from "gulp";
import env from "../env.cjs";
import "./clean.js";
import "./compress.js";
import "./entry-html.js";
import "./gather-static.js";
import "./gen-icons-json.js";
import "./locale-data.js";
import "./service-worker.js";
import "./translations.js";
import "./rspack.js";

gulp.task(
  "develop-app",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean",
    gulp.parallel(
      "gen-service-worker-app-dev",
      "gen-icons-json",
      "gen-pages-app-dev",
      "build-translations",
      "build-locale-data"
    ),
    "copy-static-app",
    "rspack-watch-app"
  )
);

gulp.task(
  "build-app",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean",
    gulp.parallel("gen-icons-json", "build-translations", "build-locale-data"),
    "copy-static-app",
    "rspack-prod-app",
    gulp.parallel("gen-pages-app-prod", "gen-service-worker-app-prod"),
    // Don't compress running tests
    ...(env.isTestBuild() || env.isStatsBuild() ? [] : ["compress-app"])
  )
);

gulp.task(
  "analyze-app",
  gulp.series(
    async function setEnv() {
      process.env.STATS = "1";
    },
    "clean",
    "rspack-prod-app"
  )
);
