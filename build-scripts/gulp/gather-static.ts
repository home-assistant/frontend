// Gulp task to gather all static files.

import fs from "fs-extra";
import path from "node:path";
import paths from "../paths.ts";

const npmPath = (...parts) =>
  path.resolve(paths.root_dir, "node_modules", ...parts);
const polyPath = (...parts) => path.resolve(paths.root_dir, ...parts);

const copyFileDir = (fromFile, toDir) =>
  fs.copySync(fromFile, path.join(toDir, path.basename(fromFile)));

const genStaticPath =
  (staticDir) =>
  (...parts) =>
    path.resolve(staticDir, ...parts);

const copyTranslations = (staticDir) => {
  const staticPath = genStaticPath(staticDir);

  // Translation output
  fs.copySync(
    polyPath("build/translations/output"),
    staticPath("translations")
  );
};

const copyLocaleData = (staticDir) => {
  const staticPath = genStaticPath(staticDir);

  // Locale data output
  fs.copySync(polyPath("build/locale-data"), staticPath("locale-data"));
};

const copyMdiIcons = (staticDir) => {
  const staticPath = genStaticPath(staticDir);

  // MDI icons output
  fs.copySync(polyPath("build/mdi"), staticPath("mdi"));
};

const copyPolyfills = (staticDir) => {
  const staticPath = genStaticPath(staticDir);

  // For custom panels using ES5 builds that don't use Babel 7+
  copyFileDir(
    npmPath("@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js"),
    staticPath("polyfills/")
  );

  // Web Component polyfills and adapters
  copyFileDir(
    npmPath("@webcomponents/webcomponentsjs/webcomponents-bundle.js"),
    staticPath("polyfills/")
  );
  copyFileDir(
    npmPath("@webcomponents/webcomponentsjs/webcomponents-bundle.js.map"),
    staticPath("polyfills/")
  );
  // Lit polyfill support
  fs.copySync(
    npmPath("lit/polyfill-support.js"),
    path.join(staticPath("polyfills/"), "lit-polyfill-support.js")
  );

  // dialog-polyfill css
  copyFileDir(
    npmPath("dialog-polyfill/dialog-polyfill.css"),
    staticPath("polyfills/")
  );
};

const copyFonts = (staticDir) => {
  const staticPath = genStaticPath(staticDir);
  // Local fonts
  fs.copySync(
    npmPath("roboto-fontface/fonts/roboto/"),
    staticPath("fonts/roboto/"),
    {
      filter: (src) => !src.includes(".") || src.endsWith(".woff2"),
    }
  );
};

const copyQrScannerWorker = (staticDir) => {
  const staticPath = genStaticPath(staticDir);
  copyFileDir(npmPath("qr-scanner/qr-scanner-worker.min.js"), staticPath("js"));
};

const copyMapPanel = (staticDir) => {
  const staticPath = genStaticPath(staticDir);
  copyFileDir(
    npmPath("leaflet/dist/leaflet.css"),
    staticPath("images/leaflet/")
  );
  copyFileDir(
    npmPath("leaflet.markercluster/dist/MarkerCluster.css"),
    staticPath("images/leaflet/")
  );
  fs.copySync(
    npmPath("leaflet/dist/images"),
    staticPath("images/leaflet/images/")
  );
};

const copyZXingWasm = (staticDir) => {
  const staticPath = genStaticPath(staticDir);
  copyFileDir(
    npmPath("zxing-wasm/dist/reader/zxing_reader.wasm"),
    staticPath("js")
  );
};

export const copyTranslationsApp = async () => {
  const staticDir = paths.app_output_static;
  copyTranslations(staticDir);
};

export const copyTranslationsSupervisor = async () => {
  const staticDir = paths.hassio_output_static;
  copyTranslations(staticDir);
};

export const copyTranslationsLandingPage = async () => {
  const staticDir = paths.landingPage_output_static;
  copyTranslations(staticDir);
};

export const copyStaticSupervisor = async () => {
  const staticDir = paths.hassio_output_static;
  copyLocaleData(staticDir);
  copyFonts(staticDir);
};

export const copyStaticApp = async () => {
  const staticDir = paths.app_output_static;
  // Basic static files
  fs.copySync(polyPath("public"), paths.app_output_root);
  copyPolyfills(staticDir);
  copyFonts(staticDir);
  copyTranslations(staticDir);
  copyLocaleData(staticDir);
  copyMdiIcons(staticDir);

  // Panel assets
  copyMapPanel(staticDir);

  // Qr Scanner assets
  copyZXingWasm(staticDir);
  copyQrScannerWorker(staticDir);
};

export const copyStaticDemo = async () => {
  // Copy app static files
  fs.copySync(
    polyPath("public/static"),
    path.resolve(paths.demo_output_root, "static")
  );
  // Copy demo static files
  fs.copySync(path.resolve(paths.demo_dir, "public"), paths.demo_output_root);
  copyPolyfills(paths.demo_output_static);
  copyMapPanel(paths.demo_output_static);
  copyFonts(paths.demo_output_static);
  copyTranslations(paths.demo_output_static);
  copyLocaleData(paths.demo_output_static);
  copyMdiIcons(paths.demo_output_static);
};

export const copyStaticCast = async () => {
  // Copy app static files
  fs.copySync(polyPath("public/static"), paths.cast_output_static);
  // Copy cast static files
  fs.copySync(path.resolve(paths.cast_dir, "public"), paths.cast_output_root);
  copyPolyfills(paths.cast_output_static);
  copyMapPanel(paths.cast_output_static);
  copyFonts(paths.cast_output_static);
  copyTranslations(paths.cast_output_static);
  copyLocaleData(paths.cast_output_static);
  copyMdiIcons(paths.cast_output_static);
};

export const copyStaticGallery = async () => {
  // Copy app static files
  fs.copySync(polyPath("public/static"), paths.gallery_output_static);
  // Copy gallery static files
  fs.copySync(
    path.resolve(paths.gallery_dir, "public"),
    paths.gallery_output_root
  );

  copyMapPanel(paths.gallery_output_static);
  copyFonts(paths.gallery_output_static);
  copyTranslations(paths.gallery_output_static);
  copyLocaleData(paths.gallery_output_static);
  copyMdiIcons(paths.gallery_output_static);
};

export const copyStaticLandingPage = async () => {
  // Copy landing-page static files
  fs.copySync(
    path.resolve(paths.landingPage_dir, "public"),
    paths.landingPage_output_root
  );

  copyFonts(paths.landingPage_output_static);
  copyTranslations(paths.landingPage_output_static);
};
