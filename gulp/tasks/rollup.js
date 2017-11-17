const gulp = require('gulp');
const rollupEach = require('gulp-rollup-each');
const rollupConfig = require('../../rollup.config');
const rollupConfigEs6 = require('../../rollup.config-es6');

gulp.task('run_rollup_es5', () => gulp.src([
  'js/core.js',
  'js/compatibility.js',
  'demo_data/demo_data.js',
])
  .pipe(rollupEach(rollupConfig, rollupConfig))
  .pipe(gulp.dest('build-temp-es5')));

gulp.task('run_rollup', () => gulp.src([
  'js/core.js',
  'js/automation-editor/automation-editor.js',
  'js/util.js',
  'js/script-editor/script-editor.js',
  'demo_data/demo_data.js',
])
  .pipe(rollupEach(rollupConfigEs6, rollupConfigEs6))
  .pipe(gulp.dest('build-temp')));

gulp.task('ru_all_es5', ['run_rollup_es5'], () => {
  gulp.src([
    'build-temp-es5/core.js',
    'build-temp-es5/compatibility.js',
  ])
    .pipe(gulp.dest('build-es5/'));
});

gulp.task('ru_all', ['run_rollup'], () => {
  gulp.src([
    'build-temp/core.js',
  ])
    .pipe(gulp.dest('build/'));
});

gulp.task('watch_ru_all', ['ru_all'], () => {
  gulp.watch([
    'js/**/*.js',
    'demo_data/**/*.js'
  ], ['ru_all']);
});

gulp.task('watch_ru_all_es5', ['ru_all_es5'], () => {
  gulp.watch([
    'js/**/*.js',
    'demo_data/**/*.js'
  ], ['ru_all_es5']);
});
