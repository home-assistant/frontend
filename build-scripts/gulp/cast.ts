import { parallel, series } from "gulp";
import { cleanCast } from "./clean.ts";
import { genPagesCastDev, genPagesCastProd } from "./entry-html.ts";
import { copyStaticCast } from "./gather-static.ts";
import { genIconsJson } from "./gen-icons-json.ts";
import { buildLocaleData } from "./locale-data.ts";
import { rspackDevServerCast, rspackProdCast } from "./rspack.ts";
import "./service-worker.ts";
import {
  buildTranslations,
  translationsEnableMergeBackend,
} from "./translations.ts";

// develop-cast
export const developCast = series(
  async () => {
    process.env.NODE_ENV = "development";
  },
  cleanCast,
  translationsEnableMergeBackend,
  parallel(genIconsJson, buildTranslations, buildLocaleData),
  copyStaticCast,
  genPagesCastDev,
  rspackDevServerCast
);

// build-cast
export const buildCast = series(
  async () => {
    process.env.NODE_ENV = "production";
  },
  cleanCast,
  translationsEnableMergeBackend,
  parallel(genIconsJson, buildTranslations, buildLocaleData),
  copyStaticCast,
  rspackProdCast,
  genPagesCastProd
);
