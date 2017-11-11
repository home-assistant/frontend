const del = require('del');
const gulp = require('gulp');

gulp.task('clean', () => del(['build-es5', 'build', 'build-temp-es5', 'build-temp', 'build-translations']));
