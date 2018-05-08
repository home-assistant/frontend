const del = require('del');
const gulp = require('gulp');
const rename = require('gulp-rename');
const replace = require('gulp-batch-replace');
const gzip = require('gulp-gzip');
const path = require('path');
const runSequence = require('run-sequence');

const {
  stripImportsStrategy,
} = require('../common/strategy');
const minifyStream = require('../common/transform').minifyStream;
const {
  bundledStreamFromHTML,
} = require('../common/html');

const OUTPUT_DIR = 'build-hassio/';

const DEPS_TO_STRIP = [
  'bower_components/font-roboto/roboto.html',
  'bower_components/paper-styles/color.html',
];

const es5Extra = "<script src='/frontend_es5/custom-elements-es5-adapter.js'></script>";

async function buildHassioPanel() {
  const stream = await bundledStreamFromHTML('hassio/hassio-app.html', {
    strategy: stripImportsStrategy(DEPS_TO_STRIP)
  });

  return minifyStream(stream, /* es6= */ false)
    .pipe(rename('hassio-app.html'))
    .pipe(gulp.dest(OUTPUT_DIR));
}

function copyHassioIndex() {
  return gulp.src('hassio/index.html')
    .pipe(replace([['<!--EXTRA_SCRIPTS-->', es5Extra]]))
    .pipe(gulp.dest(OUTPUT_DIR));
}

function gzipOutput() {
  return gulp.src(path.resolve(OUTPUT_DIR, '*.html'))
    .pipe(gzip({ skipGrowingFiles: true }))
    .pipe(gulp.dest(OUTPUT_DIR));
}

gulp.task('hassio-clean', () => del([OUTPUT_DIR]));
gulp.task('hassio-panel-es5', buildHassioPanel);
gulp.task('hassio-index-es5', copyHassioIndex);
gulp.task('hassio-gzip-es5', gzipOutput);

gulp.task('hassio-es5', () => runSequence.use(gulp)(
  'hassio-clean',
  'hassio-panel-es5',
  'hassio-index-es5',
  'hassio-gzip-es5',
));
