// Tasks to run rspack.

import rspack from "@rspack/core";
import { RspackDevServer } from "@rspack/dev-server";
import log from "fancy-log";
import { series, watch } from "gulp";
import fs from "node:fs";
import path from "node:path";
import { isDevContainer, isStatsBuild, isTestBuild } from "../env.ts";
import paths from "../paths.ts";
import {
  createAppConfig,
  createCastConfig,
  createDemoConfig,
  createGalleryConfig,
  createHassioConfig,
  createLandingPageConfig,
} from "../rspack.ts";
import {
  copyTranslationsApp,
  copyTranslationsLandingPage,
  copyTranslationsSupervisor,
} from "./gather-static.ts";
import {
  buildLandingPageTranslations,
  buildSupervisorTranslations,
  buildTranslations,
} from "./translations.ts";

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

interface RunDevServer {
  compiler: any;
  contentBase: string;
  port: number;
  listenHost?: string;
  proxy?: any;
}

/**
 * @param {{
 *   compiler: import("@rspack/core").Compiler,
 *   contentBase: string,
 *   port: number,
 *   listenHost?: string
 * }}
 */
const runDevServer = async ({
  compiler,
  contentBase,
  port,
  listenHost,
  proxy,
}: RunDevServer) => {
  if (listenHost === undefined) {
    // For dev container, we need to listen on all hosts
    listenHost = isDevContainer() ? "0.0.0.0" : "localhost";
  }
  const server = new RspackDevServer(
    {
      hot: false,
      open: true,
      host: listenHost,
      port,
      static: {
        directory: contentBase,
        watch: true,
      },
      proxy,
    },
    compiler
  );

  await server.start();
  // Server listening
  log("[rspack-dev-server]", `Project is running at http://localhost:${port}`);
};

const doneHandler = (done?: (value?: unknown) => void) => (err, stats) => {
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

export const rspackWatchApp = () => {
  // This command will run forever because we don't close compiler
  rspack(
    process.env.ES5
      ? bothBuilds(createAppConfig, { isProdBuild: false })
      : createAppConfig({ isProdBuild: false, latestBuild: true })
  ).watch({ poll: isWsl }, doneHandler());
  watch(
    path.join(paths.translations_src, "en.json"),
    series(buildTranslations, copyTranslationsApp)
  );
};

export const rspackProdApp = () =>
  prodBuild(
    bothBuilds(createAppConfig, {
      isProdBuild: true,
      isStatsBuild: isStatsBuild(),
      isTestBuild: isTestBuild(),
    })
  );

export const rspackDevServerDemo = () =>
  runDevServer({
    compiler: rspack(
      createDemoConfig({ isProdBuild: false, latestBuild: true })
    ),
    contentBase: paths.demo_output_root,
    port: 8090,
  });

export const rspackProdDemo = () =>
  prodBuild(
    bothBuilds(createDemoConfig, {
      isProdBuild: true,
      isStatsBuild: isStatsBuild(),
    })
  );

export const rspackDevServerCast = () =>
  runDevServer({
    compiler: rspack(
      createCastConfig({ isProdBuild: false, latestBuild: true })
    ),
    contentBase: paths.cast_output_root,
    port: 8080,
    // Accessible from the network, because that's how Cast hits it.
    listenHost: "0.0.0.0",
  });

export const rspackProdCast = () =>
  prodBuild(
    bothBuilds(createCastConfig, {
      isProdBuild: true,
    })
  );

export const rspackWatchHassio = () => {
  // This command will run forever because we don't close compiler
  rspack(
    createHassioConfig({
      isProdBuild: false,
      latestBuild: true,
    })
  ).watch({ ignored: /build/, poll: isWsl }, doneHandler());

  watch(
    path.join(paths.translations_src, "en.json"),
    series(buildSupervisorTranslations, copyTranslationsSupervisor)
  );
};

export const rspackProdHassio = () =>
  prodBuild(
    bothBuilds(createHassioConfig, {
      isProdBuild: true,
      isStatsBuild: isStatsBuild(),
      isTestBuild: isTestBuild(),
    })
  );

export const rspackDevServerGallery = () =>
  runDevServer({
    compiler: rspack(
      createGalleryConfig({ isProdBuild: false, latestBuild: true })
    ),
    contentBase: paths.gallery_output_root,
    port: 8100,
    listenHost: "0.0.0.0",
  });

export const rspackProdGallery = () =>
  prodBuild(
    createGalleryConfig({
      isProdBuild: true,
      latestBuild: true,
    })
  );

export const rspackWatchLandingPage = () => {
  // This command will run forever because we don't close compiler
  rspack(
    process.env.ES5
      ? bothBuilds(createLandingPageConfig, { isProdBuild: false })
      : createLandingPageConfig({ isProdBuild: false, latestBuild: true })
  ).watch({ poll: isWsl }, doneHandler());

  watch(
    path.join(paths.translations_src, "en.json"),
    series(buildLandingPageTranslations, copyTranslationsLandingPage)
  );
};

export const rspackProdLandingPage = () =>
  prodBuild(
    bothBuilds(createLandingPageConfig, {
      isProdBuild: true,
      isStatsBuild: isStatsBuild(),
      isTestBuild: isTestBuild(),
    })
  );
