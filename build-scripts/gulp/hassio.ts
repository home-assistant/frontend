import { series } from "gulp";
import { isTestBuild } from "../env.ts";
import { cleanHassio } from "./clean.ts";
import { compressHassio } from "./compress.ts";
import { genPagesHassioDev, genPagesHassioProd } from "./entry-html.ts";
import {
  copyStaticSupervisor,
  copyTranslationsSupervisor,
} from "./gather-static.ts";
import { genDummyIconsJson } from "./gen-icons-json.ts";
import { buildLocaleData } from "./locale-data.ts";
import { rspackProdHassio, rspackWatchHassio } from "./rspack.ts";
import { buildSupervisorTranslations } from "./translations.ts";

// develop-hassio
export const developHassio = series(
  async function setEnv() {
    process.env.NODE_ENV = "development";
  },
  cleanHassio,
  genDummyIconsJson,
  genPagesHassioDev,
  buildSupervisorTranslations,
  copyTranslationsSupervisor,
  buildLocaleData,
  copyStaticSupervisor,
  rspackWatchHassio
);

// build-hassio
export const buildHassio = series(
  async function setEnv() {
    process.env.NODE_ENV = "production";
  },
  cleanHassio,
  genDummyIconsJson,
  buildSupervisorTranslations,
  copyTranslationsSupervisor,
  buildLocaleData,
  copyStaticSupervisor,
  rspackProdHassio,
  genPagesHassioProd,
  ...// Don't compress running tests
  (isTestBuild() ? [] : [compressHassio])
);
