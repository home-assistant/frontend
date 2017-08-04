const del = require('del');
const gulp = require('gulp');

gulp.task('clean', () => {
  return del(['build', 'build-temp']);
});
