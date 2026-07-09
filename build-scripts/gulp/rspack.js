// Tasks to run rspack.

import fs from "fs";
import path from "path";
import log from "fancy-log";
import gulp from "gulp";
import rspack from "@rspack/core";
import { RspackDevServer } from "@rspack/dev-server";
import env from "../env.cjs";
import paths from "../paths.cjs";
import {
  createAppConfig,
  createCastConfig,
  createDemoConfig,
  createGalleryConfig,
  createLandingPageConfig,
  createE2eTestAppConfig,
} from "../rspack.cjs";

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
 *   compiler: import("@rspack/core").Compiler,
 *   contentBase: string,
 *   port: number,
 *   listenHost?: string,
 *   open?: boolean,
 *   logUrlAfterFirstBuild?: boolean,
 *   suite?: string,
 * }}
 */
const runDevServer = async ({
  compiler,
  contentBase,
  port,
  listenHost = undefined,
  open = true,
  logUrlAfterFirstBuild = false,
  proxy = undefined,
  suite = undefined,
}) => {
  if (listenHost === undefined) {
    // For dev container, we need to listen on all hosts
    listenHost = env.isDevContainer() ? "0.0.0.0" : "localhost";
  }
  const url = `http://localhost:${port}`;
  let loggedUrl = false;
  if (logUrlAfterFirstBuild) {
    compiler.hooks.done.tap("log-dev-server-url", () => {
      if (loggedUrl) {
        return;
      }
      loggedUrl = true;
      setTimeout(() => {
        log("[rspack-dev-server]", `Project is running at ${url}`);
      }, 0);
    });
  }
  const server = new RspackDevServer(
    {
      hot: false,
      open,
      host: listenHost,
      port,
      static: {
        directory: contentBase,
        watch: true,
      },
      client: {
        overlay: {
          runtimeErrors: (error) =>
            !error?.message?.includes("ResizeObserver loop"),
        },
      },
      setupMiddlewares: (middlewares) => {
        // Status endpoint so the dev-server manager can confirm this is our
        // server for the expected suite. Unshifted to beat the static handler.
        middlewares.unshift({
          name: "ha-dev-status",
          path: "/__ha_dev_status",
          middleware: (_req, res) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ server: "ha-frontend-dev", suite, port }));
          },
        });
        return middlewares;
      },
      proxy,
    },
    compiler
  );

  await server.start();
  // Server listening
  if (!logUrlAfterFirstBuild) {
    log("[rspack-dev-server]", `Project is running at ${url}`);
  }
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
    rspack(
      conf,
      // Resolve promise when done. Because we pass a callback, rspack closes itself
      doneHandler(resolve)
    );
  });

gulp.task("rspack-watch-app", () => {
  // This command will run forever because we don't close compiler
  rspack(
    process.env.ES5
      ? bothBuilds(createAppConfig, { isProdBuild: false })
      : createAppConfig({ isProdBuild: false, latestBuild: true })
  ).watch({ poll: isWsl }, doneHandler());
  gulp.watch(
    path.join(paths.translations_src, "en.json"),
    gulp.series("build-translations", "copy-translations-app")
  );
});

gulp.task("rspack-prod-app", () =>
  prodBuild(
    bothBuilds(createAppConfig, {
      isProdBuild: true,
      isStatsBuild: env.isStatsBuild(),
      isTestBuild: env.isTestBuild(),
    })
  )
);

gulp.task("rspack-dev-server-demo", () =>
  runDevServer({
    compiler: rspack(
      createDemoConfig({ isProdBuild: false, latestBuild: true })
    ),
    contentBase: paths.demo_output_root,
    port: 8090,
    open: false,
    suite: "demo",
  })
);

gulp.task("rspack-prod-demo", () =>
  prodBuild(
    bothBuilds(createDemoConfig, {
      isProdBuild: true,
      isStatsBuild: env.isStatsBuild(),
      isTestBuild: env.isTestBuild(),
    })
  )
);

gulp.task("rspack-prod-demo-e2e", () =>
  prodBuild(
    createDemoConfig({
      isProdBuild: true,
      latestBuild: true,
      isStatsBuild: env.isStatsBuild(),
      isTestBuild: env.isTestBuild(),
    })
  )
);

gulp.task("rspack-dev-server-cast", () =>
  runDevServer({
    compiler: rspack(
      createCastConfig({ isProdBuild: false, latestBuild: true })
    ),
    contentBase: paths.cast_output_root,
    port: 8080,
    // Accessible from the network, because that's how Cast hits it.
    listenHost: "0.0.0.0",
    suite: "cast",
  })
);

gulp.task("rspack-prod-cast", () =>
  prodBuild(
    bothBuilds(createCastConfig, {
      isProdBuild: true,
    })
  )
);

gulp.task("rspack-dev-server-gallery", () =>
  runDevServer({
    compiler: rspack(
      createGalleryConfig({ isProdBuild: false, latestBuild: true })
    ),
    contentBase: paths.gallery_output_root,
    port: 8100,
    listenHost: "0.0.0.0",
    open: false,
    logUrlAfterFirstBuild: true,
    suite: "gallery",
  })
);

gulp.task("rspack-prod-gallery", () =>
  prodBuild(
    createGalleryConfig({
      isProdBuild: true,
      latestBuild: true,
    })
  )
);

gulp.task("rspack-watch-landing-page", () => {
  // This command will run forever because we don't close compiler
  rspack(
    process.env.ES5
      ? bothBuilds(createLandingPageConfig, { isProdBuild: false })
      : createLandingPageConfig({ isProdBuild: false, latestBuild: true })
  ).watch({ poll: isWsl }, doneHandler());

  gulp.watch(
    path.join(paths.translations_src, "en.json"),
    gulp.series(
      "build-landing-page-translations",
      "copy-translations-landing-page"
    )
  );
});

gulp.task("rspack-prod-landing-page", () =>
  prodBuild(
    bothBuilds(createLandingPageConfig, {
      isProdBuild: true,
      isStatsBuild: env.isStatsBuild(),
      isTestBuild: env.isTestBuild(),
    })
  )
);

gulp.task("rspack-dev-server-e2e-test-app", () =>
  runDevServer({
    compiler: rspack(
      createE2eTestAppConfig({ isProdBuild: false, latestBuild: true })
    ),
    contentBase: paths.e2eTestApp_output_root,
    port: 8095,
    open: false,
    suite: "e2e-app",
  })
);

gulp.task("rspack-prod-e2e-test-app", () =>
  prodBuild(
    bothBuilds(createE2eTestAppConfig, {
      isProdBuild: true,
      isStatsBuild: env.isStatsBuild(),
      isTestBuild: env.isTestBuild(),
    })
  )
);

gulp.task("rspack-prod-e2e-test-app-e2e", () =>
  prodBuild(
    createE2eTestAppConfig({
      isProdBuild: true,
      latestBuild: true,
      isStatsBuild: env.isStatsBuild(),
      isTestBuild: env.isTestBuild(),
    })
  )
);
