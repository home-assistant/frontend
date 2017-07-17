'use strict';

import gulp from 'gulp';
import rollupEach from 'gulp-rollup-each';
import rollupConfig from './rollup.config';

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
