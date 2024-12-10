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

const compressDistBrotli = (rootDir, modernDir) =>
  gulp
    .src([`${modernDir}/**/${filesGlob}`, `${rootDir}/sw-modern.js`], {
      base: rootDir,
    })
    .pipe(brotli(brotliOptions))
    .pipe(gulp.dest(rootDir));

const compressDistZopfli = (rootDir, modernDir) =>
  gulp
    .src(
      [
        `${rootDir}/**/${filesGlob}`,
        `!${modernDir}/**/${filesGlob}`,
        `!${rootDir}/{sw-modern,service_worker}.js`,
        `${rootDir}/{authorize,onboarding}.html`,
      ],
      { base: rootDir }
    )
    .pipe(zopfli(zopfliOptions))
    .pipe(gulp.dest(rootDir));

const compressAppBrotli = () =>
  compressDistBrotli(paths.app_output_root, paths.app_output_latest);
const compressHassioBrotli = () =>
  compressDistBrotli(paths.hassio_output_root, paths.hassio_output_latest);

const compressAppZopfli = () =>
  compressDistZopfli(paths.app_output_root, paths.app_output_latest);
const compressHassioZopfli = () =>
  compressDistZopfli(paths.hassio_output_root, paths.hassio_output_latest);

gulp.task("compress-app", gulp.parallel(compressAppBrotli, compressAppZopfli));
gulp.task(
  "compress-hassio",
  gulp.parallel(compressHassioBrotli, compressHassioZopfli)
);
