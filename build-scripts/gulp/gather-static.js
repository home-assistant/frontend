// Gulp task to gather all static files.

import fs from "fs-extra";
import gulp from "gulp";
import path from "path";
import paths from "../paths.cjs";
import env from "../env.cjs";

const npmPath = (...parts) =>
  path.resolve(paths.polymer_dir, "node_modules", ...parts);
const polyPath = (...parts) => path.resolve(paths.polymer_dir, ...parts);

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

function copyPolyfills(staticDir) {
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
}

function copyLoaderJS(staticDir) {
  if (!env.useRollup()) {
    return;
  }
  const staticPath = genStaticPath(staticDir);
  copyFileDir(npmPath("systemjs/dist/s.min.js"), staticPath("js"));
  copyFileDir(npmPath("systemjs/dist/s.min.js.map"), staticPath("js"));
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

function copyMapPanel(staticDir) {
  const staticPath = genStaticPath(staticDir);
  copyFileDir(
    npmPath("leaflet/dist/leaflet.css"),
    staticPath("images/leaflet/")
  );
  fs.copySync(
    npmPath("leaflet/dist/images"),
    staticPath("images/leaflet/images/")
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

gulp.task("copy-translations-supervisor", async () => {
  const staticDir = paths.hassio_output_static;
  copyTranslations(staticDir);
});

gulp.task("copy-static-supervisor", async () => {
  const staticDir = paths.hassio_output_static;
  copyLocaleData(staticDir);
  copyFonts(staticDir);
});

gulp.task("copy-static-app", async () => {
  const staticDir = paths.app_output_static;
  // Basic static files
  fs.copySync(polyPath("public"), paths.app_output_root);

  copyLoaderJS(staticDir);
  copyPolyfills(staticDir);
  copyFonts(staticDir);
  copyTranslations(staticDir);
  copyLocaleData(staticDir);
  copyMdiIcons(staticDir);

  // Panel assets
  copyMapPanel(staticDir);

  // Qr Scanner assets
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

  copyLoaderJS(paths.demo_output_static);
  copyPolyfills(paths.demo_output_static);
  copyMapPanel(paths.demo_output_static);
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

  copyLoaderJS(paths.cast_output_static);
  copyPolyfills(paths.cast_output_static);
  copyMapPanel(paths.cast_output_static);
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

  copyMapPanel(paths.gallery_output_static);
  copyFonts(paths.gallery_output_static);
  copyTranslations(paths.gallery_output_static);
  copyLocaleData(paths.gallery_output_static);
  copyMdiIcons(paths.gallery_output_static);
});
