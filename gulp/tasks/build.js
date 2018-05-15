const gulp = require('gulp');
const filter = require('gulp-filter');
const { PolymerProject, } = require('polymer-build');
const {
  composeStrategies,
  generateShellMergeStrategy,
} = require('polymer-bundler');
const mergeStream = require('merge-stream');
const rename = require('gulp-rename');

const polymerConfig = require('../../polymer');

const minifyStream = require('../common/transform').minifyStream;
const {
  stripImportsStrategy,
  stripAllButEntrypointStrategy
} = require('../common/strategy');

function renamePanel(path) {
  // Rename panels to be panels/* and not their subdir
  if (path.basename.substr(0, 9) === 'ha-panel-' && path.extname === '.html') {
    path.dirname = 'panels/';
  }

  // Rename frontend
  if (path.dirname === 'src' && path.basename === 'home-assistant' &&
      path.extname === '.html') {
    path.dirname = '';
    path.basename = 'frontend';
  }
}

function build(es6) {
  return;
  const strategy = composeStrategies([
    generateShellMergeStrategy(polymerConfig.shell),
    stripImportsStrategy([
      'bower_components/font-roboto/roboto.html',
      'bower_components/paper-styles/color.html',
    ]),
    stripAllButEntrypointStrategy('panels/hassio/ha-panel-hassio.html')
  ]);
  const project = new PolymerProject(polymerConfig);

  return mergeStream(
    minifyStream(project.sources(), es6),
    minifyStream(project.dependencies(), es6)
  )
    .pipe(project.bundler({
      strategy,
      strip: true,
      sourcemaps: false,
      stripComments: true,
      inlineScripts: true,
      inlineCss: true,
      implicitStrip: true,
    }))
    .pipe(rename(renamePanel))
    .pipe(filter(['**', '!src/entrypoint.html']))
    .pipe(gulp.dest(es6 ? 'build' : 'build-es5'));
}
gulp.task('build_es5', ['ru_all', 'ru_all_es5', 'build-translations'], () => build(/* es6= */ false));
gulp.task('build_es6', ['ru_all', 'build-translations'], () => build(/* es6= */ true));

gulp.task('build', ['build_es5', 'build_es6']);
