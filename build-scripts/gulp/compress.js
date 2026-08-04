// Tasks to compress

import { constants } from "node:zlib";
import gulp from "gulp";
import brotli from "gulp-brotli";
import zopfli from "gulp-zopfli-green";
import paths from "../paths.cjs";

const compressSingle = (path, rootDir, compress) =>
  gulp
    .src(path, {
      base: rootDir,
      allowEmpty: true,
    })
    .pipe(
      compress === "zopfli"
        ? zopfli({ threshold: 150 })
        : brotli({
            skipLarger: true,
            params: {
              [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
            },
          })
    )
    .pipe(gulp.dest(rootDir));

const compressModernBrotliSwModern = () =>
  compressSingle(
    [`${paths.app_output_root}/sw-modern.js`],
    paths.app_output_root,
    "brotli"
  );
const compressModernBrotliJs = () =>
  compressSingle(
    [`${paths.app_output_latest}/**/*.js`],
    paths.app_output_root,
    "brotli"
  );
const compressModernBrotliJSON = () =>
  compressSingle(
    [`${paths.app_output_latest}/**/*.json`],
    paths.app_output_root,
    "brotli"
  );
const compressModernBrotliCSS = () =>
  compressSingle(
    [`${paths.app_output_latest}/**/*.css`],
    paths.app_output_root,
    "brotli"
  );
const compressModernBrotliSVG = () =>
  compressSingle(
    [`${paths.app_output_latest}/**/*.svg`],
    paths.app_output_root,
    "brotli"
  );
const compressModernBrotliXML = () =>
  compressSingle(
    [`${paths.app_output_latest}/**/*.xml`],
    paths.app_output_root,
    "brotli"
  );

const compressModernZopliSwModern = () =>
  compressSingle(
    [`${paths.app_output_root}/sw-modern.js`],
    paths.app_output_root,
    "zopfli"
  );
const compressModernZopliJs = () =>
  compressSingle(
    [`${paths.app_output_latest}/**/*.js`],
    paths.app_output_root,
    "zopfli"
  );
const compressModernZopliJSON = () =>
  compressSingle(
    [`${paths.app_output_latest}/**/*.json`],
    paths.app_output_root,
    "zopfli"
  );
const compressModernZopliCSS = () =>
  compressSingle(
    [`${paths.app_output_latest}/**/*.css`],
    paths.app_output_root,
    "zopfli"
  );
const compressModernZopliSVG = () =>
  compressSingle(
    [`${paths.app_output_latest}/**/*.svg`],
    paths.app_output_root,
    "zopfli"
  );
const compressModernZopliXML = () =>
  compressSingle(
    [`${paths.app_output_latest}/**/*.xml`],
    paths.app_output_root,
    "zopfli"
  );

const compressOtherBrotliAuthorize = () =>
  compressSingle(
    [`${paths.app_output_root}/authorize.html`],
    paths.app_output_root,
    "brotli"
  );
const compressOtherBrotliOnboarding = () =>
  compressSingle(
    [`${paths.app_output_root}/onboarding.html`],
    paths.app_output_root,
    "brotli"
  );
const compressOtherBrotliJS = () =>
  compressSingle(
    [
      `${paths.app_output_root}/**/*.js`,
      `!${paths.app_output_latest}/**/*.js`,
      `!${paths.app_output_root}/{sw-modern,service_worker}.js`,
    ],
    paths.app_output_root,
    "brotli"
  );
const compressOtherBrotliJSON = () =>
  compressSingle(
    [
      `${paths.app_output_root}/**/*.json`,
      `!${paths.app_output_latest}/**/*.json`,
    ],
    paths.app_output_root,
    "brotli"
  );
const compressOtherBrotliCSS = () =>
  compressSingle(
    [
      `${paths.app_output_root}/**/*.css`,
      `!${paths.app_output_latest}/**/*.css`,
    ],
    paths.app_output_root,
    "brotli"
  );
const compressOtherBrotliSVG = () =>
  compressSingle(
    [
      `${paths.app_output_root}/**/*.svg`,
      `!${paths.app_output_latest}/**/*.svg`,
    ],
    paths.app_output_root,
    "brotli"
  );
const compressOtherBrotliXML = () =>
  compressSingle(
    [
      `${paths.app_output_root}/**/*.xml`,
      `!${paths.app_output_latest}/**/*.xml`,
    ],
    paths.app_output_root,
    "brotli"
  );

const compressOtherZopliAuthorize = () =>
  compressSingle(
    [`${paths.app_output_root}/authorize.html`],
    paths.app_output_root,
    "zopfli"
  );
const compressOtherZopliOnboarding = () =>
  compressSingle(
    [`${paths.app_output_root}/onboarding.html`],
    paths.app_output_root,
    "zopfli"
  );
const compressOtherZopliJS = () =>
  compressSingle(
    [
      `${paths.app_output_root}/**/*.js`,
      `!${paths.app_output_latest}/**/*.js`,
      `!${paths.app_output_root}/{sw-modern,service_worker}.js`,
    ],
    paths.app_output_root,
    "zopfli"
  );
const compressOtherZopliJSON = () =>
  compressSingle(
    [
      `${paths.app_output_root}/**/*.json`,
      `!${paths.app_output_latest}/**/*.json`,
    ],
    paths.app_output_root,
    "zopfli"
  );
const compressOtherZopliCSS = () =>
  compressSingle(
    [
      `${paths.app_output_root}/**/*.css`,
      `!${paths.app_output_latest}/**/*.css`,
    ],
    paths.app_output_root,
    "zopfli"
  );
const compressOtherZopliSVG = () =>
  compressSingle(
    [
      `${paths.app_output_root}/**/*.svg`,
      `!${paths.app_output_latest}/**/*.svg`,
    ],
    paths.app_output_root,
    "zopfli"
  );
const compressOtherZopliXML = () =>
  compressSingle(
    [
      `${paths.app_output_root}/**/*.xml`,
      `!${paths.app_output_latest}/**/*.xml`,
    ],
    paths.app_output_root,
    "zopfli"
  );

gulp.task(
  "compress-app",
  gulp.parallel(
    compressModernBrotliSwModern,
    compressModernBrotliJs,
    compressModernBrotliJSON,
    compressModernBrotliCSS,
    compressModernBrotliSVG,
    compressModernBrotliXML,

    compressModernZopliSwModern,
    compressModernZopliJs,
    compressModernZopliJSON,
    compressModernZopliCSS,
    compressModernZopliSVG,
    compressModernZopliXML,

    compressOtherBrotliAuthorize,
    compressOtherBrotliOnboarding,
    compressOtherBrotliJS,
    compressOtherBrotliJSON,
    compressOtherBrotliCSS,
    compressOtherBrotliSVG,
    compressOtherBrotliXML,

    compressOtherZopliAuthorize,
    compressOtherZopliOnboarding,
    compressOtherZopliJS,
    compressOtherZopliJSON,
    compressOtherZopliCSS,
    compressOtherZopliSVG,
    compressOtherZopliXML
  )
);
