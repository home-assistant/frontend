// Tasks to compress

import { deleteAsync } from "del";
import gulp from "gulp";
import gulpIf from "gulp-if";
import vinylPaths from "vinyl-paths";
import zopfli from "gulp-zopfli-green";
import paths from "../paths.cjs";

const zopfliOptions = { threshold: 150 };

const compressedExt = /\.gz$/;
const deleteUncompressed = (p) => deleteAsync(p.replace(compressedExt, ""));

const compressDist = (rootDir) =>
  gulp
    .src([
      `${rootDir}/**/*.{js?(.map),json,css,svg,xml}`,
      `${rootDir}/{authorize,onboarding}.html`,
    ])
    .pipe(zopfli(zopfliOptions))
    .pipe(gulp.dest(rootDir))
    .pipe(gulpIf(compressedExt, vinylPaths(deleteUncompressed)));

gulp.task("compress-app", () => compressDist(paths.app_output_root));
gulp.task("compress-hassio", () => compressDist(paths.hassio_output_root));
