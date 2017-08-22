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

gulp.task('build', ['ru_all'], () => {
  const strategy = composeStrategies([
    generateShellMergeStrategy(polymerConfig.shell),
    stripImportsStrategy([
      'bower_components/font-roboto/roboto.html',
      'bower_components/paper-styles/color.html',
    ]),
    stripAllButEntrypointStrategy('panels/hassio/ha-panel-hassio.html')
  ]);
  const project = new PolymerProject(polymerConfig);

  return mergeStream(minifyStream(project.sources()),
              minifyStream(project.dependencies()))
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
    .pipe(gulp.dest('build/'));
});
