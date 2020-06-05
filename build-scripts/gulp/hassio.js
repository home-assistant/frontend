const gulp = require("gulp");
const fs = require("fs");
const path = require("path");

const env = require("../env");
const paths = require("../paths");

require("./clean.js");
require("./gen-icons-json.js");
require("./webpack.js");
require("./compress.js");
require("./rollup.js");

async function backwardsCompatibility() {
  // Until Supervisor 228, Home Assistant expected the entrypoint
  // to be available at /api/hassio/app/entrypoint.js
  // Then we changed to two builds, so now we have 2 folders.
  //
  // We redirect to the ES5 build here.
  fs.writeFileSync(
    path.resolve(paths.hassio_output_root, "entrypoint.js"),
    `
var el = document.createElement('script');
el.src = '/api/hassio/app/frontend_es5/entrypoint.js';
document.body.appendChild(el);
  `,
    { encoding: "utf-8" }
  );
}

gulp.task(
  "develop-hassio",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-hassio",
    "gen-icons-json",
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
    "gen-icons-json",
    env.useRollup() ? "rollup-prod-hassio" : "webpack-prod-hassio",
    backwardsCompatibility,
    ...// Don't compress running tests
    (env.isTest() ? [] : ["compress-hassio"])
  )
);
