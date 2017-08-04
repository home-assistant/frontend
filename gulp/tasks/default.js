const gulp = require('gulp');
const runSequence = require('run-sequence');

gulp.task('default', () => {
  return runSequence.use(gulp)(
    'clean',
    'build'
  );
});
