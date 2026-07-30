import gulp from "gulp";
import { GULP_TASKS } from "../gulp-tasks.mjs";
import { createOutputWorkflow } from "../output-lock.mjs";
import "./clean.js";
import "./entry-html.js";
import "./gather-static.js";
import "./gen-icons-json.js";
import "./service-worker.js";
import "./translations.js";
import "./rspack.js";

const workflow = createOutputWorkflow("demo", GULP_TASKS.demo);

gulp.task(
  workflow.develop.task,
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    workflow.develop.output.acquire,
    workflow.develop.generated.acquire,
    "clean-demo",
    gulp.parallel(
      "gen-icons-json",
      "gen-pages-demo-dev",
      "build-translations-backend",
      "build-locale-data"
    ),
    "copy-static-demo",
    workflow.develop.generated.snapshot,
    workflow.develop.generated.release,
    "rspack-dev-server-demo"
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
    "clean-demo",
    // Cast needs to be backwards compatible and older HA has no translations
    gulp.parallel(
      "gen-icons-json",
      "build-translations-backend",
      "build-locale-data"
    ),
    "copy-static-demo",
    "rspack-prod-demo",
    "gen-pages-demo-prod",
    workflow.build.generated.release,
    workflow.build.output.release
  )
);

gulp.task(
  workflow.e2e.task,
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    workflow.e2e.output.acquire,
    workflow.e2e.generated.acquire,
    "clean-demo",
    // Cast needs to be backwards compatible and older HA has no translations
    gulp.parallel(
      "gen-icons-json",
      "build-translations-backend",
      "build-locale-data"
    ),
    "copy-static-demo",
    "rspack-prod-demo-e2e",
    "gen-pages-demo-prod-e2e",
    workflow.e2e.generated.release,
    workflow.e2e.output.release
  )
);

gulp.task(
  workflow.analyze.task,
  gulp.series(
    async function setEnv() {
      process.env.STATS = "1";
    },
    workflow.analyze.output.acquire,
    workflow.analyze.generated.acquire,
    "clean-demo",
    "rspack-prod-demo",
    workflow.analyze.generated.release,
    workflow.analyze.output.release
  )
);
