const del = require('del');
const gulp = require('gulp');

gulp.task('clean', () => {
  return del(['build-es5', 'build', 'build-temp', 'build-translations']);
});
