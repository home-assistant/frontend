import del from 'del';
import gulp from 'gulp';

gulp.task('clean', () => {
  return del(['build', 'build-temp']);
});
