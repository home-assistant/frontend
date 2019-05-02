// Gulp task to gather all static files.

const gulp = require("gulp");
const path = require("path");
const fs = require("fs-extra");
const zopfli = require("gulp-zopfli-green");
const merge = require("merge-stream");
const config = require("../paths");

const npmPath = (...parts) =>
  path.resolve(config.polymer_dir, "node_modules", ...parts);
const polyPath = (...parts) => path.resolve(config.polymer_dir, ...parts);
const staticPath = (...parts) => path.resolve(config.root, "static", ...parts);

const copyFileDir = (fromFile, toDir) =>
  fs.copySync(fromFile, path.join(toDir, path.basename(fromFile)));

function copyTranslations() {
  // Translation output
  fs.copySync(
    polyPath("build-translations/output"),
    staticPath("translations")
  );
}

function copyStatic() {
  // Basic static files
  fs.copySync(polyPath("public"), config.root);

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

  // Local fonts
  fs.copySync(npmPath("@polymer/font-roboto-local/fonts"), staticPath("fonts"));

  // External dependency assets
  copyFileDir(
    npmPath("react-big-calendar/lib/css/react-big-calendar.css"),
    staticPath("panels/calendar/")
  );
  copyFileDir(
    npmPath("leaflet/dist/leaflet.css"),
    staticPath("images/leaflet/")
  );
  fs.copySync(
    npmPath("leaflet/dist/images"),
    staticPath("images/leaflet/images/")
  );
}

gulp.task("copy-static", (done) => {
  copyStatic();
  done();
});

gulp.task("compress-static", () => {
  const fonts = gulp
    .src(staticPath("fonts/**/*.ttf"))
    .pipe(zopfli())
    .pipe(gulp.dest(staticPath("fonts")));
  const polyfills = gulp
    .src(staticPath("polyfills/*.js"))
    .pipe(zopfli())
    .pipe(gulp.dest(staticPath("polyfills")));
  const translations = gulp
    .src(staticPath("translations/*.json"))
    .pipe(zopfli())
    .pipe(gulp.dest(staticPath("translations")));

  return merge(fonts, polyfills, translations);
});

gulp.task("copy-translations", (done) => {
  copyTranslations();
  done();
});
