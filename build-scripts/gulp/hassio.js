import gulp from "gulp";
import env from "../env.cjs";
import "./clean.js";
import "./compress.js";
import "./entry-html.js";
import "./gather-static.js";
import "./gen-icons-json.js";
import "./rollup.js";
import "./translations.js";
import "./webpack.js";

gulp.task(
  "develop-hassio",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-hassio",
    "gen-dummy-icons-json",
    "gen-pages-hassio-dev",
    "build-supervisor-translations",
    "copy-translations-supervisor",
    "build-locale-data",
    "copy-static-supervisor",
    env.useRollup() ? "rollup-watch-hassio" : "webpack-watch-hassio"
  )
);

gulp.task(
  "build-hassio",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-hassio",
    "gen-dummy-icons-json",
    "build-supervisor-translations",
    "copy-translations-supervisor",
    "build-locale-data",
    "copy-static-supervisor",
    env.useRollup() ? "rollup-prod-hassio" : "webpack-prod-hassio",
    "gen-pages-hassio-prod",
    ...// Don't compress running tests
    (env.isTestBuild() ? [] : ["compress-hassio"])
  )
);
