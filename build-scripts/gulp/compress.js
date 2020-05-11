// Tasks to compress

const gulp = require("gulp");
const zopfli = require("gulp-zopfli-green");
const merge = require("merge-stream");
const path = require("path");
const paths = require("../paths");

gulp.task("compress-app", function compressApp() {
  const jsLatest = gulp
    .src(path.resolve(paths.output, "**/*.js"))
    .pipe(zopfli({ threshold: 150 }))
    .pipe(gulp.dest(paths.output));

  const jsEs5 = gulp
    .src(path.resolve(paths.output_es5, "**/*.js"))
    .pipe(zopfli({ threshold: 150 }))
    .pipe(gulp.dest(paths.output_es5));

  const polyfills = gulp
    .src(path.resolve(paths.static, "polyfills/*.js"))
    .pipe(zopfli({ threshold: 150 }))
    .pipe(gulp.dest(path.resolve(paths.static, "polyfills")));

  const translations = gulp
    .src(path.resolve(paths.static, "translations/**/*.json"))
    .pipe(zopfli({ threshold: 150 }))
    .pipe(gulp.dest(path.resolve(paths.static, "translations")));

  const icons = gulp
    .src(path.resolve(paths.static, "mdi/*.json"))
    .pipe(zopfli({ threshold: 150 }))
    .pipe(gulp.dest(path.resolve(paths.static, "mdi")));

  return merge(jsLatest, jsEs5, polyfills, translations, icons);
});

gulp.task("compress-hassio", function compressApp() {
  return gulp
    .src(path.resolve(paths.hassio_root, "**/*.js"))
    .pipe(zopfli())
    .pipe(gulp.dest(paths.hassio_root));
});
