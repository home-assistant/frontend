const fs = require('fs');
const gulp = require('gulp');
const rename = require('gulp-rename');
const textTransformation = require('gulp-text-simple');

const {
  stripImportsStrategy,
} = require('../common/strategy');
const minifyStream = require('../common/transform').minifyStream;
const {
  bundledStreamFromHTML,
} = require('../common/html');

const DEPS_TO_STRIP = [
  'bower_components/font-roboto/roboto.html',
  'bower_components/paper-styles/color.html',
];

// Throw exception if source cannot be found.
function replaceFail(source, find, replace) {
  if (source.indexOf(find) === -1) {
    throw Error(`Unable to find ${find}`);
  }
  return source.replace(find, replace);
}

const wrapInIndex = textTransformation((panel) => {
  panel = replaceFail(panel, '<html><head></head><body><div hidden="" by-polymer-bundler="">', '');
  panel = replaceFail(panel, '</body></html>', '');
  const index = fs.readFileSync('hassio/index.html', 'UTF-8');
  return replaceFail(index, "<link rel='import' href='./hassio-app.html'>", panel);
});

async function buildHassioPanel(es6) {
  const stream = await bundledStreamFromHTML('hassio/hassio-app.html', {
    strategy: stripImportsStrategy(DEPS_TO_STRIP)
  });

  return minifyStream(stream, es6)
    .pipe(rename('hassio.html'))
    .pipe(wrapInIndex())
    .pipe(gulp.dest(es6 ? 'build-temp' : 'build-temp-es5'));
}

gulp.task('hassio-panel-es5', buildHassioPanel.bind(null, /* es6= */ false));
// gulp.task('hassio-panel', buildHassioPanel.bind(null, /* es6= */ true));
