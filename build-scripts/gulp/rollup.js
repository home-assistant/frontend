// Tasks to run Rollup

import log from "fancy-log";
import gulp from "gulp";
import http from "http";
import open from "open";
import path from "path";
import { rollup } from "rollup";
import handler from "serve-handler";
import paths from "../paths.cjs";
import rollupConfig from "../rollup.cjs";

const bothBuilds = (createConfigFunc, params) =>
  gulp.series(
    async function buildLatest() {
      await buildRollup(
        createConfigFunc({
          ...params,
          latestBuild: true,
        })
      );
    },
    async function buildES5() {
      await buildRollup(
        createConfigFunc({
          ...params,
          latestBuild: false,
        })
      );
    }
  );

function createServer(serveOptions) {
  const server = http.createServer((request, response) =>
    handler(request, response, {
      public: serveOptions.root,
    })
  );

  server.listen(
    serveOptions.port,
    serveOptions.networkAccess ? "0.0.0.0" : undefined,
    () => {
      log.info(`Available at http://localhost:${serveOptions.port}`);
      open(`http://localhost:${serveOptions.port}`);
    }
  );
}

function watchRollup(createConfig, extraWatchSrc = [], serveOptions = null) {
  const { inputOptions, outputOptions } = createConfig({
    isProdBuild: false,
    latestBuild: true,
  });

  const watcher = rollup.watch({
    ...inputOptions,
    output: [outputOptions],
    watch: {
      include: ["src/**"] + extraWatchSrc,
    },
  });

  let startedHttp = false;

  watcher.on("event", (event) => {
    if (event.code === "BUNDLE_END") {
      log(`Build done @ ${new Date().toLocaleTimeString()}`);
    } else if (event.code === "ERROR") {
      log.error(event.error);
    } else if (event.code === "END") {
      if (startedHttp || !serveOptions) {
        return;
      }
      startedHttp = true;
      createServer(serveOptions);
    }
  });

  gulp.watch(
    path.join(paths.translations_src, "en.json"),
    gulp.series("build-translations", "copy-translations-app")
  );
}

async function buildRollup(config) {
  const bundle = await rollup.rollup(config.inputOptions);
  await bundle.write(config.outputOptions);
}

gulp.task("rollup-watch-app", () => {
  watchRollup(rollupConfig.createAppConfig);
});

gulp.task("rollup-watch-hassio", () => {
  watchRollup(rollupConfig.createHassioConfig, ["hassio/src/**"]);
});

gulp.task("rollup-dev-server-demo", () => {
  watchRollup(rollupConfig.createDemoConfig, ["demo/src/**"], {
    root: paths.demo_output_root,
    port: 8090,
  });
});

gulp.task("rollup-dev-server-cast", () => {
  watchRollup(rollupConfig.createCastConfig, ["cast/src/**"], {
    root: paths.cast_output_root,
    port: 8080,
    networkAccess: true,
  });
});

gulp.task("rollup-dev-server-gallery", () => {
  watchRollup(rollupConfig.createGalleryConfig, ["gallery/src/**"], {
    root: paths.gallery_output_root,
    port: 8100,
  });
});

gulp.task(
  "rollup-prod-app",
  bothBuilds(rollupConfig.createAppConfig, { isProdBuild: true })
);

gulp.task(
  "rollup-prod-demo",
  bothBuilds(rollupConfig.createDemoConfig, { isProdBuild: true })
);

gulp.task(
  "rollup-prod-cast",
  bothBuilds(rollupConfig.createCastConfig, { isProdBuild: true })
);

gulp.task("rollup-prod-hassio", () =>
  bothBuilds(rollupConfig.createHassioConfig, { isProdBuild: true })
);

gulp.task("rollup-prod-gallery", () =>
  buildRollup(
    rollupConfig.createGalleryConfig({
      isProdBuild: true,
      latestBuild: true,
    })
  )
);
