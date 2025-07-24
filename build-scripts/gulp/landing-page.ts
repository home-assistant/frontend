import { series } from "gulp";
import { cleanLandingPage } from "./clean.ts";
import "./compress.ts";
import {
  genPagesLandingPageDev,
  genPagesLandingPageProd,
} from "./entry-html.ts";
import {
  copyStaticLandingPage,
  copyTranslationsLandingPage,
} from "./gather-static.ts";
import { buildLocaleData } from "./locale-data.ts";
import { rspackProdLandingPage, rspackWatchLandingPage } from "./rspack.ts";
import {
  buildLandingPageTranslations,
  translationsEnableMergeBackend,
} from "./translations.ts";

// develop-landing-page
export const developLandingPage = series(
  async function setEnv() {
    process.env.NODE_ENV = "development";
  },
  cleanLandingPage,
  translationsEnableMergeBackend,
  buildLandingPageTranslations,
  copyTranslationsLandingPage,
  buildLocaleData,
  copyStaticLandingPage,
  genPagesLandingPageDev,
  rspackWatchLandingPage
);

// build-landing-page
export const buildLandingPage = series(
  async function setEnv() {
    process.env.NODE_ENV = "production";
  },
  cleanLandingPage,
  buildLandingPageTranslations,
  copyTranslationsLandingPage,
  buildLocaleData,
  copyStaticLandingPage,
  rspackProdLandingPage,
  genPagesLandingPageProd
);
