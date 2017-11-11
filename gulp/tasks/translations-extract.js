const gulp = require('gulp');
const minify = require('gulp-jsonminify');
const rename = require('gulp-rename');
const streamify = require('gulp-streamify');
const zip = require('gulp-vinyl-zip');

function translationsExtract() {
  return zip.src('build-temp/Home_Assistant_-_Polymer_frontend-locale.zip')
    .pipe(rename({
      dirname: '',
    }))
    .pipe(streamify(minify()))
    .pipe(gulp.dest('translations'));
}
gulp.task('translations-extract', translationsExtract.bind(null));
