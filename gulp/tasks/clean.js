const del = require('del');
const gulp = require('gulp');

gulp.task('clean', () => {
  return del(['build', 'build-es6', 'build-temp', 'build-translations']);
});
