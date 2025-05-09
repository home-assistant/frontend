import { parallel, series, task } from "gulp";
import { isStatsBuild, isTestBuild } from "../env.ts";
import "./clean.ts";
import "./compress.ts";
import "./entry-html.ts";
import "./gather-static.ts";
import "./gen-icons-json.ts";
import "./locale-data.ts";
import "./rspack.ts";
import "./service-worker.ts";
import "./translations.ts";

task(
  "develop-app",
  series(
    async () => {
      process.env.NODE_ENV = "development";
    },
    "clean",
    parallel(
      "gen-service-worker-app-dev",
      "gen-icons-json",
      "gen-pages-app-dev",
      "build-translations",
      "build-locale-data"
    ),
    "copy-static-app",
    "rspack-watch-app"
  )
);

task(
  "build-app",
  series(
    async () => {
      process.env.NODE_ENV = "production";
    },
    "clean",
    parallel("gen-icons-json", "build-translations", "build-locale-data"),
    "copy-static-app",
    "rspack-prod-app",
    parallel("gen-pages-app-prod", "gen-service-worker-app-prod"),
    // Don't compress running tests
    ...(isTestBuild() || isStatsBuild() ? [] : ["compress-app"])
  )
);

task(
  "analyze-app",
  series(
    async () => {
      process.env.STATS = "1";
    },
    "clean",
    "rspack-prod-app"
  )
);
