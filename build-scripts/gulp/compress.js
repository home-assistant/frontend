// Tasks to compress

import { constants } from "node:zlib";
import gulp from "gulp";
import brotli from "gulp-brotli";
import paths from "../paths.cjs";

const filesGlob = "*.{js,json,css,svg,xml}";
const brotliOptions = {
  skipLarger: true,
  params: {
    [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
  },
};

const compressDistBrotli = (rootDir, modernDir, compressServiceWorker = true) =>
  gulp
    .src(
      [
        `${modernDir}/**/${filesGlob}`,
        compressServiceWorker ? `${rootDir}/sw-modern.js` : undefined,
      ].filter(Boolean),
      {
        base: rootDir,
      }
    )
    .pipe(brotli(brotliOptions))
    .pipe(gulp.dest(rootDir));

const compressAppBrotli = () =>
  compressDistBrotli(paths.app_output_root, paths.app_output_latest);
const compressHassioBrotli = () =>
  compressDistBrotli(
    paths.hassio_output_root,
    paths.hassio_output_latest,
    false
  );

gulp.task("compress-app", compressAppBrotli);
gulp.task("compress-hassio", compressHassioBrotli);
