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

const workflow = createOutputWorkflow(GULP_TASKS.demo);

gulp.task(
  workflow.develop.task,
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    workflow.develop.acquire,
    "clean-demo",
    gulp.parallel(
      "gen-icons-json",
      "gen-pages-demo-dev",
      "build-translations-backend",
      "build-locale-data"
    ),
    "copy-static-demo",
    "rspack-dev-server-demo"
  )
);

gulp.task(
  workflow.build.task,
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    workflow.build.acquire,
    "clean-demo",
    // Cast needs to be backwards compatible and older HA has no translations
    gulp.parallel(
      "gen-icons-json",
      "build-translations-backend",
      "build-locale-data"
    ),
    "copy-static-demo",
    "rspack-prod-demo",
    "gen-pages-demo-prod"
  )
);

gulp.task(
  workflow.e2e.task,
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    workflow.e2e.acquire,
    "clean-demo",
    // Cast needs to be backwards compatible and older HA has no translations
    gulp.parallel(
      "gen-icons-json",
      "build-translations-backend",
      "build-locale-data"
    ),
    "copy-static-demo",
    "rspack-prod-demo-e2e",
    "gen-pages-demo-prod-e2e"
  )
);

gulp.task(
  workflow.analyze.task,
  gulp.series(
    async function setEnv() {
      process.env.STATS = "1";
    },
    workflow.analyze.acquire,
    "clean-demo",
    "rspack-prod-demo"
  )
);
