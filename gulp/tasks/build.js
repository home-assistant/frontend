const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const { gulp: cssSlam } = require('css-slam');
const gulp = require('gulp');
const filter = require('gulp-filter');
const htmlMinifier = require('gulp-html-minifier');
const gulpif = require('gulp-if');
const { PolymerProject, HtmlSplitter } = require('polymer-build');
const {
  composeStrategies,
  generateShellMergeStrategy,
} = require('polymer-bundler');
const mergeStream = require('merge-stream');
const rename = require('gulp-rename');

const polymerConfig = require('../../polymer');

function minifyStream(stream) {
  const sourcesHtmlSplitter = new HtmlSplitter();
  return stream
    .pipe(sourcesHtmlSplitter.split())
    .pipe(gulpif(/[^app]\.js$/, babel({
      sourceType: 'script',
      presets: [
        ['es2015', { modules: false }]
      ]
    })))
    .pipe(gulpif(/\.js$/, uglify({ sourceMap: false })))
    .pipe(gulpif(/\.css$/, cssSlam()))
    .pipe(gulpif(/\.html$/, cssSlam()))
    .pipe(gulpif(/\.html$/, htmlMinifier({
      collapseWhitespace: true,
      removeComments: true
    })))
    .pipe(sourcesHtmlSplitter.rejoin());
}

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

/**
 * Polymer build strategy to strip imports, even if explictely imported
 */
function generateStripStrategy(urls) {
  return (bundles) => {
    for (const bundle of bundles) {
      for (const url of urls) {
        bundle.stripImports.add(url);
      }
    }
    return bundles;
  };
}

/**
 * Polymer build strategy to strip everything but the entrypoints
 * for bundles that match a specific entry point.
 */
function stripAllButEntrypoint(entryPoint) {
  return (bundles) => {
    for (const bundle of bundles) {
      if (bundle.entrypoints.size === 1 &&
          bundle.entrypoints.has(entryPoint)) {
        for (const file of bundle.files) {
          if (!bundle.entrypoints.has(file)) {
            bundle.stripImports.add(file);
          }
        }
      }
    }
    return bundles;
  };
}


gulp.task('build', ['ru_all'], () => {
  const strategy = composeStrategies([
    generateShellMergeStrategy(polymerConfig.shell),
    generateStripStrategy([
      'bower_components/font-roboto/roboto.html',
      'bower_components/paper-styles/color.html',
    ]),
    stripAllButEntrypoint('panels/hassio/ha-panel-hassio.html')
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
