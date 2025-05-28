import { parallel, series } from "gulp";
import { isStatsBuild, isTestBuild } from "../env.ts";
import { clean } from "./clean.ts";
import { compressApp } from "./compress.ts";
import { genPagesAppDev, genPagesAppProd } from "./entry-html.ts";
import { copyStaticApp } from "./gather-static.ts";
import { genIconsJson } from "./gen-icons-json.ts";
import { buildLocaleData } from "./locale-data.ts";
import { rspackProdApp, rspackWatchApp } from "./rspack.ts";
import {
  genServiceWorkerAppDev,
  genServiceWorkerAppProd,
} from "./service-worker.ts";
import { buildTranslations } from "./translations.ts";

// develop-app
export const developApp = series(
  async () => {
    process.env.NODE_ENV = "development";
  },
  clean,
  parallel(
    genServiceWorkerAppDev,
    genIconsJson,
    genPagesAppDev,
    buildTranslations,
    buildLocaleData
  ),
  copyStaticApp,
  rspackWatchApp
);

// build-app
export const buildApp = series(
  async () => {
    process.env.NODE_ENV = "production";
  },
  clean,
  parallel(genIconsJson, buildTranslations, buildLocaleData),
  copyStaticApp,
  rspackProdApp,
  parallel(genPagesAppProd, genServiceWorkerAppProd),
  // Don't compress running tests
  ...(isTestBuild() || isStatsBuild() ? [] : [compressApp])
);

// analyze-app
export const analyzeApp = series(
  async () => {
    process.env.STATS = "1";
  },
  clean,
  rspackProdApp
);
