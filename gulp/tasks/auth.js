const gulp = require('gulp');
const path = require('path');
const replace = require('gulp-batch-replace');
const rename = require('gulp-rename');

const config = require('../config');
const minifyStream = require('../common/transform').minifyStream;
const {
  bundledStreamFromHTML,
} = require('../common/html');

const es5Extra = "<script src='/frontend_es5/custom-elements-es5-adapter.js'></script>";

async function buildAuth(es6) {
  const frontendPath = es6 ? 'hass_frontend_latest' : 'hass_frontend_es5';
  const stream = gulp.src(path.resolve(config.polymer_dir, 'src/authorize.html'))
    .pipe(replace([
      ['<!--EXTRA_SCRIPTS-->', es6 ? '' : es5Extra],
      ['/home-assistant-polymer/build/webpack/ha-authorize.js', `/${frontendPath}/authorize.js`],
    ]));

  return minifyStream(stream, /* es6= */ es6)
    .pipe(rename('authorize.html'))
    .pipe(gulp.dest(es6 ? config.output : config.output_es5));
}

gulp.task('authorize-es5', () => buildAuth(/* es6= */ false));
gulp.task('authorize', () => buildAuth(/* es6= */ true));
