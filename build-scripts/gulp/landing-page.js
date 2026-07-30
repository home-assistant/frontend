import gulp from "gulp";
import { GULP_TASKS } from "../gulp-tasks.mjs";
import { createOutputWorkflow, runWithLock } from "../output-lock.mjs";
import "./clean.js";
import "./compress.js";
import "./entry-html.js";
import "./gather-static.js";
import "./gen-icons-json.js";
import "./translations.js";
import "./rspack.js";

const workflow = createOutputWorkflow("landing-page", GULP_TASKS.landingPage);

gulp.task("rebuild-landing-page-translations", () =>
  runWithLock(
    workflow.develop.generated,
    gulp.series(
      "build-landing-page-translations-backend",
      "copy-translations-landing-page",
      workflow.develop.generated.snapshot
    )
  )
);

gulp.task(
  workflow.develop.task,
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    workflow.develop.output.acquire,
    workflow.develop.generated.acquire,
    "clean-landing-page",
    gulp.parallel("gen-icons-json", "build-landing-page-translations-backend"),
    "copy-translations-landing-page",
    "build-locale-data",
    "copy-static-landing-page",
    "gen-pages-landing-page-dev",
    workflow.develop.generated.snapshot,
    workflow.develop.generated.release,
    "rspack-watch-landing-page"
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
    "clean-landing-page",
    gulp.parallel("gen-icons-json", "build-landing-page-translations"),
    "copy-translations-landing-page",
    "build-locale-data",
    "copy-static-landing-page",
    "rspack-prod-landing-page",
    "gen-pages-landing-page-prod",
    workflow.build.generated.release,
    workflow.build.output.release
  )
);
