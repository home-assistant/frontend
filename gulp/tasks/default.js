import gulp from 'gulp';
import runSequence from 'run-sequence';

gulp.task('default', () => {
  return runSequence.use(gulp)(
    'clean',
    'build',
  );
});
