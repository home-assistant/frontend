const gulp = require('gulp');
const replace = require('gulp-batch-replace');
const rename = require('gulp-rename');

const config = require('../config');
const {
  stripImportsStrategy,
} = require('../common/strategy');
const minifyStream = require('../common/transform').minifyStream;
const {
  bundledStreamFromHTML,
} = require('../common/html');

const es5Extra = "<script src='/frontend_es5/custom-elements-es5-adapter.js'></script>";

async function buildAuth(es6) {
  let stream = await bundledStreamFromHTML('src/authorize.html');
  stream = stream.pipe(replace([['<!--EXTRA_SCRIPTS-->', es6 ? '' : es5Extra]]));

  return minifyStream(stream, /* es6= */ es6)
    .pipe(rename('authorize.html'))
    .pipe(gulp.dest(es6 ? config.output : config.output_es5));
}

gulp.task('authorize-es5', () => buildAuth(/* es6= */ false));
gulp.task('authorize', () => buildAuth(/* es6= */ true));
