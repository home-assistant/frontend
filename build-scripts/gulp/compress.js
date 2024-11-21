// Tasks to compress

import { constants } from "node:zlib";
import gulp from "gulp";
import brotli from "gulp-brotli";
import zopfli from "gulp-zopfli-green";
import paths from "../paths.cjs";

const filesGlob = "*.{js,json,css,svg,xml}";
const brotliOptions = {
  skipLarger: true,
  params: {
    [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
  },
};
const zopfliOptions = { threshold: 150 };

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

const compressDistZopfli = (rootDir, modernDir, compressModern = false) =>
  gulp
    .src(
      [
        `${rootDir}/**/${filesGlob}`,
        compressModern ? undefined : `!${modernDir}/**/${filesGlob}`,
        `!${rootDir}/{sw-modern,service_worker}.js`,
        `${rootDir}/{authorize,onboarding}.html`,
      ].filter(Boolean),
      { base: rootDir }
    )
    .pipe(zopfli(zopfliOptions))
    .pipe(gulp.dest(rootDir));

const compressAppBrotli = () =>
  compressDistBrotli(paths.app_output_root, paths.app_output_latest);
const compressHassioBrotli = () =>
  compressDistBrotli(
    paths.hassio_output_root,
    paths.hassio_output_latest,
    false
  );

const compressAppZopfli = () =>
  compressDistZopfli(paths.app_output_root, paths.app_output_latest);
const compressHassioZopfli = () =>
  compressDistZopfli(
    paths.hassio_output_root,
    paths.hassio_output_latest,
    true
  );

gulp.task("compress-app", gulp.parallel(compressAppBrotli, compressAppZopfli));
gulp.task(
  "compress-hassio",
  gulp.parallel(compressHassioBrotli, compressHassioZopfli)
);
