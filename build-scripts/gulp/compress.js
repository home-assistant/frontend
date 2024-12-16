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

const compressModern = (rootDir, modernDir) =>
  gulp
    .src([`${modernDir}/**/${filesGlob}`, `${rootDir}/sw-modern.js`], {
      base: rootDir,
      allowEmpty: true,
    })
    .pipe(brotli(brotliOptions))
    .pipe(gulp.dest(rootDir));

const compressOther = (rootDir, modernDir) =>
  gulp
    .src(
      [
        `${rootDir}/**/${filesGlob}`,
        `!${modernDir}/**/${filesGlob}`,
        `!${rootDir}/{sw-modern,service_worker}.js`,
        `${rootDir}/{authorize,onboarding}.html`,
      ],
      { base: rootDir, allowEmpty: true }
    )
    .pipe(brotli(brotliOptions))
    .pipe(gulp.dest(rootDir));

const compressAppModern = () =>
  compressModern(paths.app_output_root, paths.app_output_latest);
const compressHassioModern = () =>
  compressModern(paths.hassio_output_root, paths.hassio_output_latest);

const compressAppOther = () =>
  compressOther(paths.app_output_root, paths.app_output_latest);
const compressHassioOther = () =>
  compressOther(paths.hassio_output_root, paths.hassio_output_latest);

gulp.task("compress-app", gulp.parallel(compressAppModern, compressAppOther));
gulp.task(
  "compress-hassio",
  gulp.parallel(compressHassioModern, compressHassioOther)
);
