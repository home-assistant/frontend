var path = require('path');
var gulp = require('gulp');
var foreach = require('gulp-foreach');
var hash = require('gulp-hash');
var insert = require('gulp-insert');
var merge = require('gulp-merge-json');
var minify = require('gulp-jsonminify');
var rename = require('gulp-rename');
var transform = require('gulp-json-transform');

var tasks = [];

var inDir = 'translations'
var outDir = 'build/translations';

function recursive_flatten (prefix, data) {
  var output = {};
  Object.keys(data).forEach(function (key) {
    if (typeof(data[key]) === 'object') {
      output = Object.assign({}, output, recursive_flatten(key + '.', data[key]));
    } else {
      output[prefix + key] = data[key];
    }
  });
  return output
}

function flatten (data) {
  return recursive_flatten('', data);
}

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
        .pipe(transform(function(data, file) {
          // Polymer.AppLocalizeBehavior requires flattened json
          return flatten(data);
        }))
        .pipe(minify())
        .pipe(gulp.dest(outDir));
    }));
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
    }))
    .pipe(hash.manifest('translationFingerprints.json'))
    .pipe(gulp.dest('build-temp'));
});
tasks.push(taskName);

var taskName = 'wrap-translation-fingerprints';
gulp.task(taskName, ['build-translation-fingerprints'], function() {
  return gulp.src('build-temp/translationFingerprints.json')
    .pipe(transform(function(data, file) {
      Object.keys(data).forEach(function (key) {
        data[key] += '.json';
      });
      return (data);
    }))
    .pipe(gulp.dest('build-temp'))
    .pipe(insert.wrap('<script>\nvar translationFingerprints = ', ';\n</script>'))
    .pipe(rename('translationFingerprints.html'))
    .pipe(gulp.dest('build-temp'));
});
tasks.push(taskName);

module.exports = tasks;
