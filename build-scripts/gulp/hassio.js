import gulp from "gulp";
import env from "../env.cjs";
import "./clean.cjs";
import "./compress.cjs";
import "./entry-html.cjs";
import "./gather-static.cjs";
import "./gen-icons-json.cjs";
import "./rollup.cjs";
import "./translations.cjs";
import "./webpack.cjs";

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
    "copy-locale-data-supervisor",
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
    "copy-locale-data-supervisor",
    env.useRollup() ? "rollup-prod-hassio" : "webpack-prod-hassio",
    "gen-pages-hassio-prod",
    ...// Don't compress running tests
    (env.isTestBuild() ? [] : ["compress-hassio"])
  )
);
