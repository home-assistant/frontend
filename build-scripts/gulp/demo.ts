import { parallel, series, task } from "gulp";
import "./clean.ts";
import "./entry-html.ts";
import "./gather-static.ts";
import "./gen-icons-json.ts";
import "./rspack.ts";
import "./service-worker.ts";
import "./translations.ts";

task(
  "develop-demo",
  series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-demo",
    "translations-enable-merge-backend",
    parallel(
      "gen-icons-json",
      "gen-pages-demo-dev",
      "build-translations",
      "build-locale-data"
    ),
    "copy-static-demo",
    "rspack-dev-server-demo"
  )
);

task(
  "build-demo",
  series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-demo",
    // Cast needs to be backwards compatible and older HA has no translations
    "translations-enable-merge-backend",
    parallel("gen-icons-json", "build-translations", "build-locale-data"),
    "copy-static-demo",
    "rspack-prod-demo",
    "gen-pages-demo-prod"
  )
);

task(
  "analyze-demo",
  series(
    async function setEnv() {
      process.env.STATS = "1";
    },
    "clean",
    "rspack-prod-demo"
  )
);
