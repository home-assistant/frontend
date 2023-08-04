// Tasks to run webpack.

import fs from "fs";
import path from "path";
import log from "fancy-log";
import gulp from "gulp";
import webpack from "webpack";
import WebpackDevServer from "webpack-dev-server";
import env from "../env.cjs";
import paths from "../paths.cjs";
import {
  createAppConfig,
  createCastConfig,
  createDemoConfig,
  createGalleryConfig,
  createHassioConfig,
} from "../webpack.cjs";

const bothBuilds = (createConfigFunc, params) => [
  createConfigFunc({ ...params, latestBuild: true }),
  createConfigFunc({ ...params, latestBuild: false }),
];

const isWsl =
  fs.existsSync("/proc/version") &&
  fs
    .readFileSync("/proc/version", "utf-8")
    .toLocaleLowerCase()
    .includes("microsoft");

/**
 * @param {{
 *   compiler: import("webpack").Compiler,
 *   contentBase: string,
 *   port: number,
 *   listenHost?: string
 * }}
 */
const runDevServer = async ({
  compiler,
  contentBase,
  port,
  listenHost = "localhost",
}) => {
  const server = new WebpackDevServer(
    {
      hot: false,
      open: true,
      host: listenHost,
      port,
      static: {
        directory: contentBase,
        watch: true,
      },
    },
    compiler
  );

  await server.start();
  // Server listening
  log("[webpack-dev-server]", `Project is running at http://localhost:${port}`);
};

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
  webpack(
    process.env.ES5
      ? bothBuilds(createAppConfig, { isProdBuild: false })
      : createAppConfig({ isProdBuild: false, latestBuild: true })
  ).watch({ poll: isWsl }, doneHandler());
  gulp.watch(
    path.join(paths.translations_src, "en.json"),
    gulp.series("create-translations", "copy-translations-app")
  );
});

gulp.task("webpack-prod-app", () =>
  prodBuild(
    bothBuilds(createAppConfig, {
      isProdBuild: true,
      isStatsBuild: env.isStatsBuild(),
      isTestBuild: env.isTestBuild(),
    })
  )
);

gulp.task("webpack-dev-server-demo", () =>
  runDevServer({
    compiler: webpack(bothBuilds(createDemoConfig, { isProdBuild: false })),
    contentBase: paths.demo_output_root,
    port: 8090,
  })
);

gulp.task("webpack-prod-demo", () =>
  prodBuild(
    bothBuilds(createDemoConfig, {
      isProdBuild: true,
    })
  )
);

gulp.task("webpack-dev-server-cast", () =>
  runDevServer({
    compiler: webpack(bothBuilds(createCastConfig, { isProdBuild: false })),
    contentBase: paths.cast_output_root,
    port: 8080,
    // Accessible from the network, because that's how Cast hits it.
    listenHost: "0.0.0.0",
  })
);

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
  ).watch({ ignored: /build/, poll: isWsl }, doneHandler());

  gulp.watch(
    path.join(paths.translations_src, "en.json"),
    gulp.series("build-supervisor-translations", "copy-translations-supervisor")
  );
});

gulp.task("webpack-prod-hassio", () =>
  prodBuild(
    bothBuilds(createHassioConfig, {
      isProdBuild: true,
      isStatsBuild: env.isStatsBuild(),
      isTestBuild: env.isTestBuild(),
    })
  )
);

gulp.task("webpack-dev-server-gallery", () =>
  runDevServer({
    // We don't use the es5 build, but the dev server will fuck up the publicPath if we don't
    compiler: webpack(bothBuilds(createGalleryConfig, { isProdBuild: false })),
    contentBase: paths.gallery_output_root,
    port: 8100,
    listenHost: "0.0.0.0",
  })
);

gulp.task("webpack-prod-gallery", () =>
  prodBuild(
    createGalleryConfig({
      isProdBuild: true,
      latestBuild: true,
    })
  )
);
