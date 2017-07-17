'use strict';

import del from 'del';
import filter from 'gulp-filter';
import gulp from 'gulp';
import rollupEach from 'gulp-rollup-each';
import gulpif from 'gulp-if';
import { gulp as cssSlam } from 'css-slam';
import htmlMinifier from 'gulp-html-minifier';
import { PolymerProject, HtmlSplitter } from 'polymer-build';
import mergeStream from 'merge-stream';
import babel from 'gulp-babel';
import rename from 'gulp-rename';

import rollupConfig from './rollup.config';
import polymerConfig from './polymer';

gulp.task('run_rollup', () => {
  return gulp.src([
    'js/core.js',
    'js/compatibility.js',
    'js/editor/editor.js',
    'demo_data/demo_data.js',
  ])
  .pipe(rollupEach(rollupConfig))
  .pipe(gulp.dest('build-temp'));
});

gulp.task('ru_all', ['run_rollup'], () => {
  gulp.src([
    'build-temp/core.js',
    'build-temp/compatibility.js',
  ])
  .pipe(gulp.dest('build/'));
});

gulp.task('watch_ru_all', ['ru_all'], () => {
  gulp.watch([
    'js/**/*.js',
    'demo_data/**/*.js'
  ], ['ru_all']);
});

function minifyStream(stream) {
  const sourcesHtmlSplitter = new HtmlSplitter();
  return stream
    .pipe(sourcesHtmlSplitter.split())
    .pipe(gulpif(/\.js$/, babel({
      presets: ['babili'], // 'es2015'
      // plugins: ['external-helpers']
    })))
    .pipe(gulpif(/\.css$/, cssSlam()))
    .pipe(gulpif(/\.html$/, cssSlam()))
    .pipe(gulpif(/\.html$/, htmlMinifier({
      collapseWhitespace: true,
      removeComments: true
    })))
    .pipe(sourcesHtmlSplitter.rejoin());
}

gulp.task('clean', () => {
  return del(['build', 'build-temp']);
});

function renamePanel(path) {
  // Rename panels to be panels/* and not their subdir
  if (path.basename.substr(0, 9) === 'ha-panel-' && path.extname === '.html') {
    path.dirname = 'panels/';
  }

  if (path.dirname === 'src' && path.basename === 'home-assistant' &&
      path.extname === '.html') {
    path.dirname = '';
    path.basename = 'frontend';
  }
}

gulp.task('build', ['clean', 'ru_all'], () => {
  const project = new PolymerProject(polymerConfig);
  mergeStream(minifyStream(project.sources()),
              minifyStream(project.dependencies()))
    .pipe(project.bundler({
      // TODO this doesn't work yet
      stripExcludes: [
        'bower_components/font-roboto/roboto.html',
        'bower_components/paper-styles/color.html',
        // The Hass.io panel will be loaded on demand from supervisor
        'panels/hassio/hassio-main.html'
      ],
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

/*

TODO

Add build for Hass.io panel.

      Target: './build-temp/hassio-main.html',

      stripExcludes: [
        'bower_components/font-roboto/roboto.html',
        'bower_components/paper-styles/color.html',
        'bower_components/polymer/polymer.html',
        'bower_components/iron-meta/iron-meta.html',
      ]

*/
