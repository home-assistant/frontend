const dir = require('require-dir');
const gulp = require('gulp');

const tasks = dir('./gulp-tasks');

Object.keys(tasks).forEach(function (taskName) {
  gulp.task(taskName, tasks[taskName]);
});

gulp.task('default', Object.keys(tasks));
