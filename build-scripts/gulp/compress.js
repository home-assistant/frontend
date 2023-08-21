// Tasks to compress

import gulp from "gulp";
import zopfli from "gulp-zopfli-green";
import paths from "../paths.cjs";

const zopfliOptions = { threshold: 150 };

const compressDist = (rootDir) =>
  gulp
    .src([`${rootDir}/**/*.{js,json,css,svg}`])
    .pipe(zopfli(zopfliOptions))
    .pipe(gulp.dest(rootDir));

gulp.task("compress-app", () => compressDist(paths.app_output_root));
gulp.task("compress-hassio", () => compressDist(paths.hassio_output_root));
