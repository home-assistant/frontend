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

const compressModern = (rootDir, modernDir, compress) =>
  gulp
    .src([`${modernDir}/**/${filesGlob}`, `${rootDir}/sw-modern.js`], {
      base: rootDir,
      allowEmpty: true,
    })
    .pipe(compress === "zopfli" ? zopfli(zopfliOptions) : brotli(brotliOptions))
    .pipe(gulp.dest(rootDir));

const compressOther = (rootDir, modernDir, compress) =>
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
    .pipe(compress === "zopfli" ? zopfli(zopfliOptions) : brotli(brotliOptions))
    .pipe(gulp.dest(rootDir));

const compressAppModernBrotli = () =>
  compressModern(paths.app_output_root, paths.app_output_latest, "brotli");
const compressAppModernZopfli = () =>
  compressModern(paths.app_output_root, paths.app_output_latest, "zopfli");

const compressHassioModernBrotli = () =>
  compressModern(
    paths.hassio_output_root,
    paths.hassio_output_latest,
    "brotli"
  );
const compressHassioModernZopfli = () =>
  compressModern(
    paths.hassio_output_root,
    paths.hassio_output_latest,
    "zopfli"
  );

const compressAppOtherBrotli = () =>
  compressOther(paths.app_output_root, paths.app_output_latest, "brotli");
const compressAppOtherZopfli = () =>
  compressOther(paths.app_output_root, paths.app_output_latest, "zopfli");

const compressHassioOtherBrotli = () =>
  compressOther(paths.hassio_output_root, paths.hassio_output_latest, "brotli");
const compressHassioOtherZopfli = () =>
  compressOther(paths.hassio_output_root, paths.hassio_output_latest, "zopfli");

gulp.task(
  "compress-app",
  gulp.parallel(
    compressAppModernBrotli,
    compressAppOtherBrotli,
    compressAppModernZopfli,
    compressAppOtherZopfli
  )
);
gulp.task(
  "compress-hassio",
  gulp.parallel(
    compressHassioModernBrotli,
    compressHassioOtherBrotli,
    compressHassioModernZopfli,
    compressHassioOtherZopfli
  )
);
