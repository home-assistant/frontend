import { series, task } from "gulp";
import "./clean.ts";
import "./compress.ts";
import "./entry-html.ts";
import "./gather-static.ts";
import "./gen-icons-json.ts";
import "./rspack.ts";
import "./translations.ts";

task(
  "develop-landing-page",
  series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-landing-page",
    "translations-enable-merge-backend",
    "build-landing-page-translations",
    "copy-translations-landing-page",
    "build-locale-data",
    "copy-static-landing-page",
    "gen-pages-landing-page-dev",
    "rspack-watch-landing-page"
  )
);

task(
  "build-landing-page",
  series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-landing-page",
    "build-landing-page-translations",
    "copy-translations-landing-page",
    "build-locale-data",
    "copy-static-landing-page",
    "rspack-prod-landing-page",
    "gen-pages-landing-page-prod"
  )
);
