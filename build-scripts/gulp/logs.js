import gulp from "gulp";
import "./clean.js";
import "./entry-html.js";
import "./gather-static.js";
import "./gen-icons-json.js";
import "./translations.js";
import "./rspack.js";

gulp.task(
  "develop-logs",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-logs",
    gulp.parallel(
      "gen-icons-json",
      "gen-pages-logs-dev",
      "build-translations",
      "build-locale-data"
    ),
    "copy-static-logs",
    "rspack-dev-server-logs"
  )
);

gulp.task(
  "build-logs",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-logs",
    gulp.parallel("gen-icons-json", "build-translations", "build-locale-data"),
    "copy-static-logs",
    "rspack-prod-logs",
    "gen-pages-logs-prod"
  )
);
