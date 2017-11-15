const gulp = require('gulp');
const rename = require('gulp-rename');

const {
  stripImportsStrategy,
} = require('../common/strategy');
const minifyStream = require('../common/transform').minifyStream;
const {
  bundledStreamFromHTML,
  findDependencies
} = require('../common/html');

const { polymer_dir } = require('../config');

const DEPS_TO_STRIP = [
  'bower_components/font-roboto/roboto.html',
  'bower_components/paper-styles/color.html',
  'bower_components/iron-meta/iron-meta.html',
];
const DEPS_TO_STRIP_RECURSIVELY = [
  'bower_components/polymer/polymer.html',
];

async function buildHassioPanel(es6) {
  const toStrip = [...DEPS_TO_STRIP];

  for (const dep of DEPS_TO_STRIP_RECURSIVELY) {
    toStrip.push(dep);
    const deps = await findDependencies(polymer_dir, dep);
    for (const importUrl of deps) {
      toStrip.push(importUrl);
    }
  }

  const stream = await bundledStreamFromHTML('panels/hassio/hassio-main.html', {
    strategy: stripImportsStrategy(toStrip)
  });

  return minifyStream(stream, es6)
    .pipe(rename(`hassio-main-${es6 ? 'latest' : 'es5'}.html`))
    .pipe(gulp.dest('build-temp'));
}

gulp.task('hassio-panel-es5', buildHassioPanel.bind(null, /* es6= */ false));
gulp.task('hassio-panel', buildHassioPanel.bind(null, /* es6= */ true));
