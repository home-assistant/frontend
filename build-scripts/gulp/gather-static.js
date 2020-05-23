// Gulp task to gather all static files.

const gulp = require("gulp");
const path = require("path");
const cpx = require("cpx");
const fs = require("fs-extra");
const paths = require("../paths");

const npmPath = (...parts) =>
  path.resolve(paths.polymer_dir, "node_modules", ...parts);
const polyPath = (...parts) => path.resolve(paths.polymer_dir, ...parts);

const copyFileDir = (fromFile, toDir) =>
  fs.copySync(fromFile, path.join(toDir, path.basename(fromFile)));

const genStaticPath = (staticDir) => (...parts) =>
  path.resolve(staticDir, ...parts);

function copyTranslations(staticDir) {
  const staticPath = genStaticPath(staticDir);

  // Translation output
  fs.copySync(
    polyPath("build-translations/output"),
    staticPath("translations")
  );
}

function copyMdiIcons(staticDir) {
  const staticPath = genStaticPath(staticDir);

  // MDI icons output
  fs.copySync(polyPath("build/mdi"), staticPath("mdi"));
}

function copyPolyfills(staticDir) {
  const staticPath = genStaticPath(staticDir);

  // Web Component polyfills and adapters
  copyFileDir(
    npmPath("@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js"),
    staticPath("polyfills/")
  );
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
  const staticPath = genStaticPath(staticDir);
  copyFileDir(npmPath("systemjs/dist/s.min.js"), staticPath("js"));
  copyFileDir(npmPath("systemjs/dist/s.min.js.map"), staticPath("js"));
}

function copyFonts(staticDir) {
  const staticPath = genStaticPath(staticDir);
  // Local fonts
  cpx.copySync(
    npmPath("roboto-fontface/fonts/roboto/*.woff2"),
    staticPath("fonts/roboto")
  );
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

gulp.task("copy-translations-app", async () => {
  const staticDir = paths.static;
  copyTranslations(staticDir);
});

gulp.task("copy-static-app", async () => {
  const staticDir = paths.static;
  // Basic static files
  fs.copySync(polyPath("public"), paths.root);

  copyLoaderJS(staticDir);
  copyPolyfills(staticDir);
  copyFonts(staticDir);
  copyTranslations(staticDir);
  copyMdiIcons(staticDir);

  // Panel assets
  copyMapPanel(staticDir);
});

gulp.task("copy-static-demo", async () => {
  // Copy app static files
  fs.copySync(
    polyPath("public/static"),
    path.resolve(paths.demo_root, "static")
  );
  // Copy demo static files
  fs.copySync(path.resolve(paths.demo_dir, "public"), paths.demo_root);

  copyLoaderJS(paths.demo_static);
  copyPolyfills(paths.demo_static);
  copyMapPanel(paths.demo_static);
  copyFonts(paths.demo_static);
  copyTranslations(paths.demo_static);
  copyMdiIcons(paths.demo_static);
});

gulp.task("copy-static-cast", async () => {
  // Copy app static files
  fs.copySync(polyPath("public/static"), paths.cast_static);
  // Copy cast static files
  fs.copySync(path.resolve(paths.cast_dir, "public"), paths.cast_root);

  copyLoaderJS(paths.cast_static);
  copyPolyfills(paths.cast_static);
  copyMapPanel(paths.cast_static);
  copyFonts(paths.cast_static);
  copyTranslations(paths.cast_static);
  copyMdiIcons(paths.cast_static);
});

gulp.task("copy-static-gallery", async () => {
  // Copy app static files
  fs.copySync(polyPath("public/static"), paths.gallery_static);
  // Copy gallery static files
  fs.copySync(path.resolve(paths.gallery_dir, "public"), paths.gallery_root);

  copyMapPanel(paths.gallery_static);
  copyFonts(paths.gallery_static);
  copyTranslations(paths.gallery_static);
  copyMdiIcons(paths.gallery_static);
});
