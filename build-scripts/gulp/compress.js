// Tasks to compress

const gulp = require("gulp");
const zopfli = require("gulp-zopfli-green");
const merge = require("merge-stream");
const path = require("path");
const paths = require("../paths");

const zopfliOptions = { threshold: 150 };

gulp.task("compress-app", function compressApp() {
  const jsLatest = gulp
    .src(path.resolve(paths.app_output_latest, "**/*.js"))
    .pipe(zopfli(zopfliOptions))
    .pipe(gulp.dest(paths.app_output_latest));

  const jsEs5 = gulp
    .src(path.resolve(paths.app_output_es5, "**/*.js"))
    .pipe(zopfli(zopfliOptions))
    .pipe(gulp.dest(paths.app_output_es5));

  const polyfills = gulp
    .src(path.resolve(paths.app_output_static, "polyfills/*.js"))
    .pipe(zopfli(zopfliOptions))
    .pipe(gulp.dest(path.resolve(paths.app_output_static, "polyfills")));

  const translations = gulp
    .src(path.resolve(paths.app_output_static, "translations/**/*.json"))
    .pipe(zopfli(zopfliOptions))
    .pipe(gulp.dest(path.resolve(paths.app_output_static, "translations")));

  const icons = gulp
    .src(path.resolve(paths.app_output_static, "mdi/*.json"))
    .pipe(zopfli(zopfliOptions))
    .pipe(gulp.dest(path.resolve(paths.app_output_static, "mdi")));

  return merge(jsLatest, jsEs5, polyfills, translations, icons);
});

gulp.task("compress-hassio", function compressApp() {
  return gulp
    .src(path.resolve(paths.hassio_output_root, "**/*.js"))
    .pipe(zopfli(zopfliOptions))
    .pipe(gulp.dest(paths.hassio_output_root));
});
