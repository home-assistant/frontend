import gulp from "gulp";
import env from "../env.cjs";
import "./clean.cjs";
import "./compress.cjs";
import "./entry-html.cjs";
import "./gather-static.cjs";
import "./gen-icons-json.cjs";
import "./locale-data.cjs";
import "./rollup.cjs";
import "./service-worker.cjs";
import "./translations.cjs";
import "./wds.cjs";
import "./webpack.cjs";

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
    env.useWDS()
      ? "wds-watch-app"
      : env.useRollup()
      ? "rollup-watch-app"
      : "webpack-watch-app"
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
    env.useRollup() ? "rollup-prod-app" : "webpack-prod-app",
    // Don't compress running tests
    ...(env.isTestBuild() ? [] : ["compress-app"]),
    gulp.parallel("gen-pages-app-prod", "gen-service-worker-app-prod")
  )
);
