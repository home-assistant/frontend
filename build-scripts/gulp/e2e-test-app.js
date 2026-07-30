import gulp from "gulp";
import { GULP_TASKS } from "../gulp-tasks.mjs";
import { createOutputWorkflow } from "../output-lock.mjs";
import "./clean.js";
import "./entry-html.js";
import "./gather-static.js";
import "./gen-icons-json.js";
import "./translations.js";
import "./rspack.js";

const workflow = createOutputWorkflow(GULP_TASKS.e2eApp);

gulp.task(
  workflow.develop.task,
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    workflow.develop.acquire,
    "clean-e2e-test-app",
    gulp.parallel(
      "gen-icons-json",
      "gen-pages-e2e-test-app-dev",
      "build-translations-backend",
      "build-locale-data"
    ),
    "copy-static-e2e-test-app",
    "rspack-dev-server-e2e-test-app"
  )
);

gulp.task(
  workflow.build.task,
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    workflow.build.acquire,
    "clean-e2e-test-app",
    gulp.parallel(
      "gen-icons-json",
      "build-translations-backend",
      "build-locale-data"
    ),
    "copy-static-e2e-test-app",
    "rspack-prod-e2e-test-app",
    "gen-pages-e2e-test-app-prod"
  )
);

gulp.task(
  workflow.e2e.task,
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    workflow.e2e.acquire,
    "clean-e2e-test-app",
    gulp.parallel(
      "gen-icons-json",
      "build-translations-backend",
      "build-locale-data"
    ),
    "copy-static-e2e-test-app",
    "rspack-prod-e2e-test-app-e2e",
    "gen-pages-e2e-test-app-prod"
  )
);
