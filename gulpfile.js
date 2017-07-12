var gulp = require('gulp');

var rollup = require('rollup-vinyl-stream');
var watch = require('gulp-watch');

let cache;

const _ru_base = function(rollup_config) {
  return rollup({
      config: 'rollup/' + rollup_config,
      cache,
    })
    .on('bundle', (bundle) => cache = bundle)
    .pipe(gulp.dest('./'));
};

gulp.task('ru_automation', function() {
  return _ru_base('automation.js');
});

gulp.task('ru_core', function() {
  return _ru_base('core.js');
});

gulp.task('ru_compatibility', function() {
  return _ru_base('compatibility.js');
});

gulp.task('ru_demo', function() {
  return _ru_base('demo.js');
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
