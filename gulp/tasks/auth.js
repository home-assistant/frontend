const gulp = require('gulp');
const rename = require('gulp-rename');

const config = require('../config');
const {
  stripImportsStrategy,
} = require('../common/strategy');
const minifyStream = require('../common/transform').minifyStream;
const {
  bundledStreamFromHTML,
} = require('../common/html');

async function buildAuth(es6) {
  const stream = await bundledStreamFromHTML('src/authorize.html');

  return minifyStream(stream, /* es6= */ es6)
    .pipe(rename('authorize.html'))
    .pipe(gulp.dest(es6 ? config.output : config.output_es5));
}

gulp.task('authorize-es5', () => buildAuth(/* es6= */ false));
gulp.task('authorize', () => buildAuth(/* es6= */ true));
