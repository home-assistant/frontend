// Gulp task to gather all static files.

import fs from "fs-extra";
import gulp from "gulp";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "path";
import paths from "../paths.cjs";
import { ensureMapAssets, mapAssetsDir } from "./map-assets.js";

const require = createRequire(import.meta.url);

const npmPath = (...parts) =>
  path.resolve(paths.root_dir, "node_modules", ...parts);
const polyPath = (...parts) => path.resolve(paths.root_dir, ...parts);

const copyFileDir = (fromFile, toDir) =>
  fs.copySync(fromFile, path.join(toDir, path.basename(fromFile)));

const genStaticPath =
  (staticDir) =>
  (...parts) =>
    path.resolve(staticDir, ...parts);

function copyTranslations(staticDir) {
  const staticPath = genStaticPath(staticDir);

  // Translation output
  fs.copySync(
    polyPath("build/translations/output"),
    staticPath("translations")
  );
}

function copyLocaleData(staticDir) {
  const staticPath = genStaticPath(staticDir);

  // Locale data output
  fs.copySync(polyPath("build/locale-data"), staticPath("locale-data"));
}

function copyMdiIcons(staticDir) {
  const staticPath = genStaticPath(staticDir);

  // MDI icons output
  fs.copySync(polyPath("build/mdi"), staticPath("mdi"));
}

function copyFonts(staticDir) {
  const staticPath = genStaticPath(staticDir);
  // Local fonts
  fs.copySync(
    npmPath("roboto-fontface/fonts/roboto/"),
    staticPath("fonts/roboto/"),
    {
      filter: (src) => !src.includes(".") || src.endsWith(".woff2"),
    }
  );
}

function copyQrScannerWorker(staticDir) {
  const staticPath = genStaticPath(staticDir);
  copyFileDir(npmPath("qr-scanner/qr-scanner-worker.min.js"), staticPath("js"));
}

async function copyMapPanel(staticDir) {
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

  // Style, glyphs and sprites for the vector base map
  await ensureMapAssets();
  fs.copySync(mapAssetsDir, staticPath("map/"));
  // Controls and popups of the native MapLibre engine
  copyFileDir(npmPath("maplibre-gl/dist/maplibre-gl.css"), staticPath("map/"));
}

function copyZXingWasm(staticDir) {
  const staticPath = genStaticPath(staticDir);
  // Resolve through barcode-detector, the wasm must match the zxing-wasm JS it bundles
  const zxingWasm = createRequire(require.resolve("barcode-detector")).resolve(
    "zxing-wasm/reader/zxing_reader.wasm"
  );
  const {
    ZXING_WASM_SHA256,
    ZXING_WASM_VERSION,
  } = require("barcode-detector/pure");
  const wasm = fs.readFileSync(zxingWasm);
  if (createHash("sha256").update(wasm).digest("hex") !== ZXING_WASM_SHA256) {
    throw new Error(
      `${zxingWasm} does not match the zxing-wasm ${ZXING_WASM_VERSION} bundled in barcode-detector`
    );
  }
  // Versioned file name, see locateFile in ha-qr-scanner
  fs.outputFileSync(
    staticPath("js", `zxing_reader-${ZXING_WASM_VERSION}.wasm`),
    wasm
  );
}

gulp.task("copy-locale-data", async () => {
  const staticDir = paths.app_output_static;
  copyLocaleData(staticDir);
});

gulp.task("copy-translations-app", async () => {
  const staticDir = paths.app_output_static;
  copyTranslations(staticDir);
});

gulp.task("copy-translations-landing-page", async () => {
  const staticDir = paths.landingPage_output_static;
  copyTranslations(staticDir);
});

gulp.task("copy-static-app", async () => {
  const staticDir = paths.app_output_static;
  // Basic static files
  fs.copySync(polyPath("public"), paths.app_output_root);
  copyFonts(staticDir);
  copyTranslations(staticDir);
  copyLocaleData(staticDir);
  copyMdiIcons(staticDir);

  // Panel assets
  await copyMapPanel(staticDir);

  // Qr Scanner assets
  copyZXingWasm(staticDir);
  copyQrScannerWorker(staticDir);
});

gulp.task("copy-static-demo", async () => {
  // Copy app static files
  fs.copySync(
    polyPath("public/static"),
    path.resolve(paths.demo_output_root, "static")
  );
  // Copy demo static files
  fs.copySync(path.resolve(paths.demo_dir, "public"), paths.demo_output_root);
  await copyMapPanel(paths.demo_output_static);
  copyFonts(paths.demo_output_static);
  copyTranslations(paths.demo_output_static);
  copyLocaleData(paths.demo_output_static);
  copyMdiIcons(paths.demo_output_static);
});

gulp.task("copy-static-cast", async () => {
  // Copy app static files
  fs.copySync(polyPath("public/static"), paths.cast_output_static);
  // Copy cast static files
  fs.copySync(path.resolve(paths.cast_dir, "public"), paths.cast_output_root);
  await copyMapPanel(paths.cast_output_static);
  copyFonts(paths.cast_output_static);
  copyTranslations(paths.cast_output_static);
  copyLocaleData(paths.cast_output_static);
  copyMdiIcons(paths.cast_output_static);
});

gulp.task("copy-static-gallery", async () => {
  // Copy app static files
  fs.copySync(polyPath("public/static"), paths.gallery_output_static);
  // Copy gallery static files
  fs.copySync(
    path.resolve(paths.gallery_dir, "public"),
    paths.gallery_output_root
  );

  await copyMapPanel(paths.gallery_output_static);
  copyFonts(paths.gallery_output_static);
  copyTranslations(paths.gallery_output_static);
  copyLocaleData(paths.gallery_output_static);
  copyMdiIcons(paths.gallery_output_static);
});

gulp.task("copy-static-landing-page", async () => {
  // Copy landing-page static files
  fs.copySync(
    path.resolve(paths.landingPage_dir, "public"),
    paths.landingPage_output_root
  );

  copyFonts(paths.landingPage_output_static);
  copyTranslations(paths.landingPage_output_static);
  copyLocaleData(paths.landingPage_output_static);
});

gulp.task("copy-static-e2e-test-app", async () => {
  // Copy app static files (icons, polyfills, etc.)
  fs.copySync(
    polyPath("public/static"),
    path.resolve(paths.e2eTestApp_output_root, "static")
  );
  // Copy e2e test app public files (manifest, sw stubs)
  const e2ePublic = path.resolve(paths.e2eTestApp_dir, "public");
  if (fs.existsSync(e2ePublic)) {
    fs.copySync(e2ePublic, paths.e2eTestApp_output_root);
  }

  await copyMapPanel(paths.e2eTestApp_output_static);
  copyFonts(paths.e2eTestApp_output_static);
  copyTranslations(paths.e2eTestApp_output_static);
  copyLocaleData(paths.e2eTestApp_output_static);
  copyMdiIcons(paths.e2eTestApp_output_static);
});
