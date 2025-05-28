import { analyzeApp, buildApp, developApp } from "./app";
import { buildCast, developCast } from "./cast";
import { analyzeDemo, buildDemo, developDemo } from "./demo";
import { downloadTranslations } from "./download-translations";
import { setupAndFetchNightlyTranslations } from "./fetch-nightly-translations";
import { buildGallery, developGallery, gatherGalleryPages } from "./gallery";
import { genIconsJson } from "./gen-icons-json";
import { buildHassio, developHassio } from "./hassio";
import { buildLandingPage, developLandingPage } from "./landing-page";
import { buildLocaleData } from "./locale-data";
import { buildTranslations } from "./translations";

export default {
  "develop-app": developApp,
  "build-app": buildApp,
  "analyze-app": analyzeApp,

  "develop-cast": developCast,
  "build-cast": buildCast,

  "develop-demo": developDemo,
  "build-demo": buildDemo,
  "analyze-demo": analyzeDemo,

  "develop-gallery": developGallery,
  "build-gallery": buildGallery,
  "gather-gallery-pages": gatherGalleryPages,

  "develop-hassio": developHassio,
  "build-hassio": buildHassio,

  "develop-landing-page": developLandingPage,
  "build-landing-page": buildLandingPage,

  "setup-and-fetch-nightly-translations": setupAndFetchNightlyTranslations,
  "download-translations": downloadTranslations,
  "build-translations": buildTranslations,

  "gen-icons-json": genIconsJson,

  "build-locale-data": buildLocaleData,
};
