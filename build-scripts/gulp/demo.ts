import { parallel, series } from "gulp";
import { clean, cleanDemo } from "./clean.ts";
import { genPagesDemoDev, genPagesDemoProd } from "./entry-html.ts";
import { copyStaticDemo } from "./gather-static.ts";
import { genIconsJson } from "./gen-icons-json.ts";
import { buildLocaleData } from "./locale-data.ts";
import { rspackDevServerDemo, rspackProdDemo } from "./rspack.ts";
import "./service-worker.ts";
import {
  buildTranslations,
  translationsEnableMergeBackend,
} from "./translations.ts";

// develop-demo
export const developDemo = series(
  async function setEnv() {
    process.env.NODE_ENV = "development";
  },
  cleanDemo,
  translationsEnableMergeBackend,
  parallel(genIconsJson, genPagesDemoDev, buildTranslations, buildLocaleData),
  copyStaticDemo,
  rspackDevServerDemo
);

// build-demo
export const buildDemo = series(
  async function setEnv() {
    process.env.NODE_ENV = "production";
  },
  cleanDemo,
  // Cast needs to be backwards compatible and older HA has no translations
  translationsEnableMergeBackend,
  parallel(genIconsJson, buildTranslations, buildLocaleData),
  copyStaticDemo,
  rspackProdDemo,
  genPagesDemoProd
);

// analyze-demo
export const analyzeDemo = series(
  async function setEnv() {
    process.env.STATS = "1";
  },
  clean,
  rspackProdDemo
);
