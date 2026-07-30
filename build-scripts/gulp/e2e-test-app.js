import gulp from "gulp";
import { GULP_TASKS } from "../gulp-tasks.mjs";
import { createOutputWorkflow } from "../output-lock.mjs";
import "./clean.js";
import "./entry-html.js";
import "./gather-static.js";
import "./gen-icons-json.js";
import "./translations.js";
import "./rspack.js";

const workflow = createOutputWorkflow("e2e-app", GULP_TASKS.e2eApp);

gulp.task(
  workflow.develop.task,
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    workflow.develop.output.acquire,
    workflow.develop.generated.acquire,
    "clean-e2e-test-app",
    gulp.parallel(
      "gen-icons-json",
      "gen-pages-e2e-test-app-dev",
      "build-translations-backend",
      "build-locale-data"
    ),
    "copy-static-e2e-test-app",
    workflow.develop.generated.snapshot,
    workflow.develop.generated.release,
    "rspack-dev-server-e2e-test-app"
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
    "clean-e2e-test-app",
    gulp.parallel(
      "gen-icons-json",
      "build-translations-backend",
      "build-locale-data"
    ),
    "copy-static-e2e-test-app",
    "rspack-prod-e2e-test-app",
    "gen-pages-e2e-test-app-prod",
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
    "clean-e2e-test-app",
    gulp.parallel(
      "gen-icons-json",
      "build-translations-backend",
      "build-locale-data"
    ),
    "copy-static-e2e-test-app",
    "rspack-prod-e2e-test-app-e2e",
    "gen-pages-e2e-test-app-prod",
    workflow.e2e.generated.release,
    workflow.e2e.output.release
  )
);
