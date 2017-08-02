import buble from 'gulp-buble';
import uglify from 'gulp-uglify';
import { gulp as cssSlam } from 'css-slam';
import gulp from 'gulp';
import filter from 'gulp-filter';
import htmlMinifier from 'gulp-html-minifier';
import gulpif from 'gulp-if';
import { PolymerProject, HtmlSplitter } from 'polymer-build';
import {
  composeStrategies,
  generateShellMergeStrategy,
} from 'polymer-bundler';
import mergeStream from 'merge-stream';
import rename from 'gulp-rename';

import polymerConfig from '../../polymer';

function minifyStream(stream) {
  const sourcesHtmlSplitter = new HtmlSplitter();
  return stream
    .pipe(sourcesHtmlSplitter.split())
    .pipe(gulpif(/\.js$/, buble()))
    .pipe(gulpif(/\.js$/, uglify({ sourceMap : false })))
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
