const del = require('del');
const gulp = require('gulp');

gulp.task('clean', () => del(['build-es5', 'build', 'build-temp', 'build-translations']));
