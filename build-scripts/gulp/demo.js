import gulp from "gulp";
import env from "../env.cjs";
import "./clean.cjs";
import "./entry-html.cjs";
import "./gather-static.cjs";
import "./gen-icons-json.cjs";
import "./rollup.cjs";
import "./service-worker.cjs";
import "./translations.cjs";
import "./webpack.cjs";

gulp.task(
  "develop-demo",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-demo",
    "translations-enable-merge-backend",
    gulp.parallel(
      "gen-icons-json",
      "gen-pages-demo-dev",
      "build-translations",
      "build-locale-data"
    ),
    "copy-static-demo",
    env.useRollup() ? "rollup-dev-server-demo" : "webpack-dev-server-demo"
  )
);

gulp.task(
  "build-demo",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-demo",
    // Cast needs to be backwards compatible and older HA has no translations
    "translations-enable-merge-backend",
    gulp.parallel("gen-icons-json", "build-translations", "build-locale-data"),
    "copy-static-demo",
    env.useRollup() ? "rollup-prod-demo" : "webpack-prod-demo",
    "gen-pages-demo-prod"
  )
);
