import { series, task } from "gulp";
import { isTestBuild } from "../env.ts";
import "./clean.ts";
import "./compress.ts";
import "./entry-html.ts";
import "./gather-static.ts";
import "./gen-icons-json.ts";
import "./rspack.ts";
import "./translations.ts";

task(
  "develop-hassio",
  series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-hassio",
    "gen-dummy-icons-json",
    "gen-pages-hassio-dev",
    "build-supervisor-translations",
    "copy-translations-supervisor",
    "build-locale-data",
    "copy-static-supervisor",
    "rspack-watch-hassio"
  )
);

task(
  "build-hassio",
  series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-hassio",
    "gen-dummy-icons-json",
    "build-supervisor-translations",
    "copy-translations-supervisor",
    "build-locale-data",
    "copy-static-supervisor",
    "rspack-prod-hassio",
    "gen-pages-hassio-prod",
    ...// Don't compress running tests
    (isTestBuild() ? [] : ["compress-hassio"])
  )
);
