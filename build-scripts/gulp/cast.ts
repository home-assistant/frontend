import { parallel, series, task } from "gulp";
import "./clean.ts";
import "./entry-html.ts";
import "./gather-static.ts";
import "./rspack.ts";
import "./service-worker.ts";
import "./translations.ts";

task(
  "develop-cast",
  series(
    async () => {
      process.env.NODE_ENV = "development";
    },
    "clean-cast",
    "translations-enable-merge-backend",
    parallel("gen-icons-json", "build-translations", "build-locale-data"),
    "copy-static-cast",
    "gen-pages-cast-dev",
    "rspack-dev-server-cast"
  )
);

task(
  "build-cast",
  series(
    async () => {
      process.env.NODE_ENV = "production";
    },
    "clean-cast",
    "translations-enable-merge-backend",
    parallel("gen-icons-json", "build-translations", "build-locale-data"),
    "copy-static-cast",
    "rspack-prod-cast",
    "gen-pages-cast-prod"
  )
);
