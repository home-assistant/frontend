const gulp = require('gulp');
const rollupEach = require('gulp-rollup-each');
const rollupConfig = require('../../rollup.config');
const rollupConfigEs6 = require('../../rollup.config-es6');

gulp.task('run_rollup', () => {
  return gulp.src([
    'js/core.js',
    'js/compatibility.js',
    'js/automation-editor/automation-editor.js',
    'js/script-editor/script-editor.js',
    'demo_data/demo_data.js',
  ])
  .pipe(rollupEach(rollupConfig, rollupConfig))
  .pipe(gulp.dest('build-temp'));
});

gulp.task('run_rollup_es6', () => {
  return gulp.src([
    'js/core.js',
    'js/automation-editor/automation-editor.js',
    'js/script-editor/script-editor.js',
    'demo_data/demo_data.js',
  ])
  .pipe(rollupEach(rollupConfigEs6, rollupConfigEs6))
  .pipe(gulp.dest('build-temp'));
});

gulp.task('ru_all', ['run_rollup'], () => {
  gulp.src([
    'build-temp/core.js',
    'build-temp/compatibility.js',
  ])
  .pipe(gulp.dest('build/'));
});

gulp.task('ru_all_es6', ['run_rollup_es6'], () => {
  gulp.src([
    'build-temp/core.js',
  ])
  .pipe(gulp.dest('build-es6/'));
});

gulp.task('watch_ru_all', ['ru_all'], () => {
  gulp.watch([
    'js/**/*.js',
    'demo_data/**/*.js'
  ], ['ru_all']);
});

gulp.task('watch_ru_all_es6', ['ru_all_es6'], () => {
  gulp.watch([
    'js/**/*.js',
    'demo_data/**/*.js'
  ], ['ru_all_es6']);
});
