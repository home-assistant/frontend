// Tasks to run webpack.
const gulp = require("gulp");
const webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");
const log = require("fancy-log");
const paths = require("../paths");
const {
  createAppConfig,
  createDemoConfig,
  createCastConfig,
  createHassioConfig,
  createGalleryConfig,
} = require("../webpack");

const bothBuilds = (createConfigFunc, params) => [
  createConfigFunc({ ...params, latestBuild: true }),
  createConfigFunc({ ...params, latestBuild: false }),
];

const runDevServer = ({
  compiler,
  contentBase,
  port,
  listenHost = "localhost",
}) =>
  new WebpackDevServer(compiler, {
    open: true,
    watchContentBase: true,
    contentBase,
  }).listen(port, listenHost, function(err) {
    if (err) {
      throw err;
    }
    // Server listening
    log("[webpack-dev-server]", `http://localhost:${port}`);
  });

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
  // we are not calling done, so this command will run forever
  webpack(bothBuilds(createAppConfig, { isProdBuild: false })).watch(
    {},
    handler()
  );
});

gulp.task(
  "webpack-prod-app",
  () =>
    new Promise((resolve) =>
      webpack(
        bothBuilds(createAppConfig, { isProdBuild: true }),
        handler(resolve)
      )
    )
);

gulp.task("webpack-dev-server-demo", () => {
  runDevServer({
    compiler: webpack(bothBuilds(createDemoConfig, { isProdBuild: false })),
    contentBase: paths.demo_root,
    port: 8090,
  });
});

gulp.task(
  "webpack-prod-demo",
  () =>
    new Promise((resolve) =>
      webpack(
        bothBuilds(createDemoConfig, {
          isProdBuild: true,
        }),
        handler(resolve)
      )
    )
);

gulp.task("webpack-dev-server-cast", () => {
  runDevServer({
    compiler: webpack(bothBuilds(createCastConfig, { isProdBuild: false })),
    contentBase: paths.cast_root,
    port: 8080,
    // Accessible from the network, because that's how Cast hits it.
    listenHost: "0.0.0.0",
  });
});

gulp.task(
  "webpack-prod-cast",
  () =>
    new Promise((resolve) =>
      webpack(
        bothBuilds(createCastConfig, {
          isProdBuild: true,
        }),

        handler(resolve)
      )
    )
);

gulp.task("webpack-watch-hassio", () => {
  // we are not calling done, so this command will run forever
  webpack(
    createHassioConfig({
      isProdBuild: false,
      latestBuild: false,
    })
  ).watch({}, handler());
});

gulp.task(
  "webpack-prod-hassio",
  () =>
    new Promise((resolve) =>
      webpack(
        createHassioConfig({
          isProdBuild: true,
          latestBuild: false,
        }),
        handler(resolve)
      )
    )
);

gulp.task("webpack-dev-server-gallery", () => {
  runDevServer({
    compiler: webpack(
      createGalleryConfig({ latestBuild: true, isProdBuild: false })
    ),
    contentBase: paths.gallery_root,
    port: 8100,
  });
});

gulp.task(
  "webpack-prod-gallery",
  () =>
    new Promise((resolve) =>
      webpack(
        createGalleryConfig({
          isProdBuild: true,
          latestBuild: true,
        }),

        handler(resolve)
      )
    )
);
