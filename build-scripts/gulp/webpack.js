// Tasks to run webpack.
const gulp = require("gulp");
const path = require("path");
const webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");
const log = require("fancy-log");
const paths = require("../paths");
const {
  createAppConfig,
  createDemoConfig,
  createCastConfig,
} = require("../webpack");

const handler = (done) => (err, stats) => {
  if (err) {
    console.log(err.stack || err);
    if (err.details) {
      console.log(err.details);
    }
    return;
  }

  log(`Build done @ ${new Date().toLocaleTimeString()}`);

  if (stats.hasErrors() || stats.hasWarnings()) {
    console.log(stats.toString("minimal"));
  }

  if (done) {
    done();
  }
};

gulp.task("webpack-watch-app", () => {
  const compiler = webpack([
    createAppConfig({
      isProdBuild: false,
      latestBuild: true,
      isStatsBuild: false,
    }),
    createAppConfig({
      isProdBuild: false,
      latestBuild: false,
      isStatsBuild: false,
    }),
  ]);
  compiler.watch({}, handler());
  // we are not calling done, so this command will run forever
});

gulp.task(
  "webpack-prod-app",
  () =>
    new Promise((resolve) =>
      webpack(
        [
          createAppConfig({
            isProdBuild: true,
            latestBuild: true,
            isStatsBuild: false,
          }),
          createAppConfig({
            isProdBuild: true,
            latestBuild: false,
            isStatsBuild: false,
          }),
        ],
        handler(resolve)
      )
    )
);

gulp.task("webpack-dev-server-demo", () => {
  const compiler = webpack([
    createDemoConfig({
      isProdBuild: false,
      latestBuild: false,
      isStatsBuild: false,
    }),
    createDemoConfig({
      isProdBuild: false,
      latestBuild: true,
      isStatsBuild: false,
    }),
  ]);

  new WebpackDevServer(compiler, {
    open: true,
    watchContentBase: true,
    contentBase: path.resolve(paths.demo_dir, "dist"),
  }).listen(8090, "localhost", function(err) {
    if (err) {
      throw err;
    }
    // Server listening
    log("[webpack-dev-server]", "http://localhost:8090");
  });
});

gulp.task(
  "webpack-prod-demo",
  () =>
    new Promise((resolve) =>
      webpack(
        [
          createDemoConfig({
            isProdBuild: true,
            latestBuild: false,
            isStatsBuild: false,
          }),
          createDemoConfig({
            isProdBuild: true,
            latestBuild: true,
            isStatsBuild: false,
          }),
        ],
        handler(resolve)
      )
    )
);

gulp.task("webpack-dev-server-cast", () => {
  const compiler = webpack([
    createCastConfig({
      isProdBuild: false,
      latestBuild: false,
    }),
    createCastConfig({
      isProdBuild: false,
      latestBuild: true,
    }),
  ]);

  new WebpackDevServer(compiler, {
    open: true,
    watchContentBase: true,
    contentBase: path.resolve(paths.cast_dir, "dist"),
  }).listen(
    8080,
    // Accessible from the network, because that's how Cast hits it.
    "0.0.0.0",
    function(err) {
      if (err) {
        throw err;
      }
      // Server listening
      log("[webpack-dev-server]", "http://localhost:8080");
    }
  );
});

gulp.task(
  "webpack-prod-cast",
  () =>
    new Promise((resolve) =>
      webpack(
        [
          createCastConfig({
            isProdBuild: true,
            latestBuild: false,
          }),
          createCastConfig({
            isProdBuild: true,
            latestBuild: true,
          }),
        ],
        handler(resolve)
      )
    )
);
