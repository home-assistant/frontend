// Tasks to run webpack.
const gulp = require("gulp");
const webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");
const log = require("fancy-log");
const path = require("path");
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

/**
 * @param {{
 *   compiler: import("webpack").Compiler,
 *   contentBase: string,
 *   port: number,
 *   listenHost?: string
 * }}
 */
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
  }).listen(port, listenHost, function (err) {
    if (err) {
      throw err;
    }
    // Server listening
    log(
      "[webpack-dev-server]",
      `Project is running at http://localhost:${port}`
    );
  });

const doneHandler = (done) => (err, stats) => {
  if (err) {
    log.error(err.stack || err);
    if (err.details) {
      log.error(err.details);
    }
    return;
  }

  if (stats.hasErrors() || stats.hasWarnings()) {
    console.log(stats.toString("minimal"));
  }

  log(`Build done @ ${new Date().toLocaleTimeString()}`);

  if (done) {
    done();
  }
};

const prodBuild = (conf) =>
  new Promise((resolve) => {
    webpack(
      conf,
      // Resolve promise when done. Because we pass a callback, webpack closes itself
      doneHandler(resolve)
    );
  });

gulp.task("webpack-watch-app", () => {
  // This command will run forever because we don't close compiler
  webpack(createAppConfig({ isProdBuild: false, latestBuild: true })).watch(
    { ignored: /build-translations/ },
    doneHandler()
  );
  gulp.watch(
    path.join(paths.translations_src, "en.json"),
    gulp.series("build-translations", "copy-translations-app")
  );
});

gulp.task("webpack-prod-app", () =>
  prodBuild(
    bothBuilds(createAppConfig, {
      isProdBuild: true,
    })
  )
);

gulp.task("webpack-dev-server-demo", () => {
  runDevServer({
    compiler: webpack(bothBuilds(createDemoConfig, { isProdBuild: false })),
    contentBase: paths.demo_output_root,
    port: 8090,
  });
});

gulp.task("webpack-prod-demo", () =>
  prodBuild(
    bothBuilds(createDemoConfig, {
      isProdBuild: true,
    })
  )
);

gulp.task("webpack-dev-server-cast", () => {
  runDevServer({
    compiler: webpack(bothBuilds(createCastConfig, { isProdBuild: false })),
    contentBase: paths.cast_output_root,
    port: 8080,
    // Accessible from the network, because that's how Cast hits it.
    listenHost: "0.0.0.0",
  });
});

gulp.task("webpack-prod-cast", () =>
  prodBuild(
    bothBuilds(createCastConfig, {
      isProdBuild: true,
    })
  )
);

gulp.task("webpack-watch-hassio", () => {
  // This command will run forever because we don't close compiler
  webpack(
    createHassioConfig({
      isProdBuild: false,
      latestBuild: true,
    })
  ).watch({ ignored: /build-translations/ }, doneHandler());

  gulp.watch(
    path.join(paths.translations_src, "en.json"),
    gulp.series("build-supervisor-translations", "copy-translations-supervisor")
  );
});

gulp.task("webpack-prod-hassio", () =>
  prodBuild(
    bothBuilds(createHassioConfig, {
      isProdBuild: true,
    })
  )
);

gulp.task("webpack-dev-server-gallery", () => {
  runDevServer({
    // We don't use the es5 build, but the dev server will fuck up the publicPath if we don't
    compiler: webpack(bothBuilds(createGalleryConfig, { isProdBuild: false })),
    contentBase: paths.gallery_output_root,
    port: 8100,
  });
});

gulp.task("webpack-prod-gallery", () =>
  prodBuild(
    createGalleryConfig({
      isProdBuild: true,
      latestBuild: true,
    })
  )
);
