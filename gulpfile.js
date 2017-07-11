var gulp = require('gulp');

var rollup = require('rollup-vinyl-stream');
var watch = require('gulp-watch');

let cache;

gulp.task('ru_automation', function() {
  return rollup({
      config: 'rollup/automation.js',
      cache,
    })
    .on('bundle', (bundle) => cache = bundle)
    .pipe(gulp.dest('./'));
});

gulp.task('ru_core', function() {
  return rollup({
      config: 'rollup/core.js',
      cache,
    })
    .on('bundle', (bundle) => cache = bundle)
    .pipe(gulp.dest('./'));
});

gulp.task('ru_compatibility', function() {
  return rollup({
      config: 'rollup/compatibility.js',
      cache,
    })
    .on('bundle', (bundle) => cache = bundle)
    .pipe(gulp.dest('./'));
});

gulp.task('ru_demo', function() {
  return rollup({
      config: 'rollup/demo.js',
      cache,
    })
    .on('bundle', (bundle) => cache = bundle)
    .pipe(gulp.dest('./'));
});

gulp.task('ru_all', [
  'ru_automation',
  'ru_core',
  'ru_compatibility',
  'ru_demo',
]);

gulp.task('watch_ru_all', ['ru_all'], function() {
  gulp.watch('panels/automation/editor.js', ['ru_all']);
});
