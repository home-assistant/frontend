// eslint-disable-next-line import/no-extraneous-dependencies
import gulp from "gulp";
import "./clean.ts";
import "./compress.ts";
import env from "../env";
import "./entry-html.ts";
import "./gather-static.ts";
import "./gen-icons-json.ts";
import "./locale-data.ts";
import "./rspack.ts";
import "./service-worker.ts";
import "./translations.ts";

gulp.task(
  "develop-app",
  gulp.series(
    async () => {
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
    async () => {
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
    async () => {
      process.env.STATS = "1";
    },
    "clean",
    "rspack-prod-app"
  )
);
