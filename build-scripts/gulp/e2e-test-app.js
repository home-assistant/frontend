import gulp from "gulp";
import { createWorkflowLockTask } from "../output-lock.mjs";
import "./clean.js";
import "./entry-html.js";
import "./gather-static.js";
import "./gen-icons-json.js";
import "./translations.js";
import "./rspack.js";

gulp.task(
  "develop-e2e-test-app",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    createWorkflowLockTask("develop-e2e-test-app"),
    "clean-e2e-test-app",
    "translations-enable-merge-backend",
    gulp.parallel(
      "gen-icons-json",
      "gen-pages-e2e-test-app-dev",
      "build-translations",
      "build-locale-data"
    ),
    "copy-static-e2e-test-app",
    "rspack-dev-server-e2e-test-app"
  )
);

gulp.task(
  "build-e2e-test-app",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    createWorkflowLockTask("build-e2e-test-app"),
    "clean-e2e-test-app",
    "translations-enable-merge-backend",
    gulp.parallel("gen-icons-json", "build-translations", "build-locale-data"),
    "copy-static-e2e-test-app",
    "rspack-prod-e2e-test-app",
    "gen-pages-e2e-test-app-prod"
  )
);

gulp.task(
  "build-e2e-test-app-e2e",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-e2e-test-app",
    "translations-enable-merge-backend",
    gulp.parallel("gen-icons-json", "build-translations", "build-locale-data"),
    "copy-static-e2e-test-app",
    "rspack-prod-e2e-test-app-e2e",
    "gen-pages-e2e-test-app-prod"
  )
);
