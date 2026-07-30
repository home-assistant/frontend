import gulp from "gulp";
import { GULP_TASKS } from "../gulp-tasks.mjs";
import { createOutputWorkflow } from "../output-lock.mjs";
import "./clean.js";
import "./entry-html.js";
import "./gather-static.js";
import "./service-worker.js";
import "./translations.js";
import "./rspack.js";

const workflow = createOutputWorkflow("cast", GULP_TASKS.cast);

gulp.task(
  workflow.develop.task,
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    workflow.develop.output.acquire,
    workflow.develop.generated.acquire,
    "clean-cast",
    gulp.parallel(
      "gen-icons-json",
      "build-translations-backend",
      "build-locale-data"
    ),
    "copy-static-cast",
    "gen-pages-cast-dev",
    workflow.develop.generated.snapshot,
    workflow.develop.generated.release,
    "rspack-dev-server-cast"
  )
);

gulp.task(
  workflow.build.task,
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    workflow.build.output.acquire,
    workflow.build.generated.acquire,
    "clean-cast",
    gulp.parallel(
      "gen-icons-json",
      "build-translations-backend",
      "build-locale-data"
    ),
    "copy-static-cast",
    "rspack-prod-cast",
    "gen-pages-cast-prod",
    workflow.build.generated.release,
    workflow.build.output.release
  )
);
