var path = require('path');
var gulp = require('gulp');
var foreach = require('gulp-foreach');
var hash = require('gulp-hash');
var insert = require('gulp-insert');
var merge = require('gulp-merge-json');
var minify = require('gulp-jsonminify');
var rename = require('gulp-rename');

var tasks = [];

var inDir = 'translations'
var outDir = 'build/translations';

var taskName = 'build-merged-translations';
gulp.task(taskName, function () {
  return gulp.src(inDir + '/*.json')
    .pipe(foreach(function(stream, file) {
      // For each language generate a merged json file. It begins with en.json as
      // a failsafe for untranslated strings, and merges all parent tags into one
      // file for each specific subtag
      var tr = path.basename(file.history[0], '.json');
      var subtags = tr.split('-');
      var src = [inDir + '/en.json']; // Start with en as a fallback for missing translations
      for (i = 1; i <= subtags.length; i++) {
        var lang = subtags.slice(0, i).join('-');
        src.push(inDir + '/' + lang + '.json');
      }
      return gulp.src(src)
        .pipe(merge({
          fileName: tr + '.json',
        }))
        .pipe(minify())
        .pipe(gulp.dest(outDir));
    }));
});
tasks.push(taskName);

var taskName = 'build-fallback-translation';
gulp.task(taskName, function() {
  return gulp.src(inDir + '/en.json')
    .pipe(insert.wrap('<script>\nvar fallbackTranslation = ', ';\n</script>'))
    .pipe(rename('fallbackTranslation.html'))
    .pipe(gulp.dest('build-temp'));
});
tasks.push(taskName);

var taskName = 'build-translation-fingerprints';
gulp.task(taskName, ['build-merged-translations'], function() {
  return gulp.src(outDir + '/*.json')
    .pipe(rename({
      extname: "",
    }))
    .pipe(hash({
      algorithm: 'md5',
      hashLength: 32,
      template: '<%= hash %>'
    }))
    .pipe(hash.manifest('translationFingerprints.json'))
    .pipe(gulp.dest('build-temp'));
});
tasks.push(taskName);

var taskName = 'wrap-translation-fingerprints';
gulp.task(taskName, ['build-translation-fingerprints'], function() {
  return gulp.src('build-temp/translationFingerprints.json')
    .pipe(insert.wrap('<script>\nvar translationFingerprints = ', ';\n</script>'))
    .pipe(rename('translationFingerprints.html'))
    .pipe(gulp.dest('build-temp'));
});
tasks.push(taskName);

module.exports = tasks;
