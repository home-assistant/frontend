// Tasks to run webpack.
const gulp = require("gulp");
const webpack = require("webpack");
const { createAppConfig } = require("../webpack");

const handler = (done) => (err, stats) => {
  if (err) {
    console.log(err.stack || err);
    if (err.details) {
      console.log(err.details);
    }
    return;
  }

  console.log(`Build done @ ${new Date().toLocaleTimeString()}`);

  if (stats.hasErrors() || stats.hasWarnings()) {
    console.log(stats.toString("minimal"));
  }

  if (done) {
    done();
  }
};

gulp.task("webpack-watch", () => {
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
  "webpack-prod",
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
