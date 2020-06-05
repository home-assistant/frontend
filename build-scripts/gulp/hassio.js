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

async function writeEntrypointJS() {
  // We ship two builds and we need to do feature detection on what version to load.
  fs.mkdirSync(paths.hassio_output_root, { recursive: true });
  fs.writeFileSync(
    path.resolve(paths.hassio_output_root, "entrypoint.js"),
    `
try {
  new Function("import('${paths.hassio_publicPath}/frontend_latest/entrypoint.js')")();
} catch (err) {
  var el = document.createElement('script');
  el.src = '${paths.hassio_publicPath}/frontend_es5/entrypoint.js';
  document.body.appendChild(el);
}
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
    writeEntrypointJS,
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
    writeEntrypointJS,
    ...// Don't compress running tests
    (env.isTest() ? [] : ["compress-hassio"])
  )
);
