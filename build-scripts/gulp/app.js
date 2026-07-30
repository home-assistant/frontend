import gulp from "gulp";
import env from "../env.cjs";
import { GULP_TASKS } from "../gulp-tasks.mjs";
import { createOutputWorkflow } from "../output-lock.mjs";
import "./clean.js";
import "./compress.js";
import "./entry-html.js";
import "./gather-static.js";
import "./gen-icons-json.js";
import "./licenses.js";
import "./locale-data.js";
import "./service-worker.js";
import "./translations.js";
import "./rspack.js";

const workflow = createOutputWorkflow(GULP_TASKS.app);

gulp.task(
  workflow.develop.task,
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    workflow.develop.acquire,
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
  workflow.build.task,
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    workflow.build.acquire,
    "clean",
    gulp.parallel(
      "gen-icons-json",
      "build-translations",
      "build-locale-data",
      "gen-licenses"
    ),
    "copy-static-app",
    "rspack-prod-app",
    gulp.parallel("gen-pages-app-prod", "gen-service-worker-app-prod"),
    // Don't compress running tests
    ...(env.isTestBuild() || env.isStatsBuild() ? [] : ["compress-app"])
  )
);

gulp.task(
  workflow.modern.task,
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    workflow.modern.acquire,
    "clean",
    gulp.parallel(
      "gen-icons-json",
      "build-translations",
      "build-locale-data",
      "gen-licenses"
    ),
    "copy-static-app",
    "rspack-prod-app-modern",
    gulp.parallel(
      "gen-pages-app-prod-modern",
      "gen-service-worker-app-prod-modern"
    ),
    ...(env.isTestBuild() || env.isStatsBuild() ? [] : ["compress-app"])
  )
);

gulp.task(
  workflow.analyze.task,
  gulp.series(
    async function setEnv() {
      process.env.STATS = "1";
    },
    workflow.analyze.acquire,
    "clean",
    "rspack-prod-app"
  )
);
