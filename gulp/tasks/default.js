const gulp = require('gulp');
const runSequence = require('run-sequence');

gulp.task('default', () => runSequence.use(gulp)(
  'clean',
  'build_es5',
  'build',
));
