const path = require('path');
const gulp = require('gulp');
const foreach = require('gulp-foreach');
const hash = require('gulp-hash');
const insert = require('gulp-insert');
const merge = require('gulp-merge-json');
const minify = require('gulp-jsonminify');
const rename = require('gulp-rename');
const transform = require('gulp-json-transform');

const inDir = 'translations';
const outDir = 'build-translations';

const tasks = [];

function recursiveFlatten(prefix, data) {
  var output = {};
  Object.keys(data).forEach(function (key) {
    if (typeof (data[key]) === 'object') {
      output = Object.assign({}, output, recursiveFlatten(key + '.', data[key]));
    } else {
      output[prefix + key] = data[key];
    }
  });
  return output;
}

function flatten(data) {
  return recursiveFlatten('', data);
}

let taskName = 'build-merged-translations';
gulp.task(taskName, function () {
  return gulp.src(inDir + '/*.json')
    .pipe(foreach(function (stream, file) {
      // For each language generate a merged json file. It begins with en.json as
      // a failsafe for untranslated strings, and merges all parent tags into one
      // file for each specific subtag
      const tr = path.basename(file.history[0], '.json');
      const subtags = tr.split('-');
      const src = [inDir + '/en.json']; // Start with en as a fallback for missing translations
      for (let i = 1; i <= subtags.length; i++) {
        const lang = subtags.slice(0, i).join('-');
        src.push(inDir + '/' + lang + '.json');
      }
      return gulp.src(src)
        .pipe(transform(function (data) {
          // Polymer.AppLocalizeBehavior requires flattened json
          return flatten(data);
        }))
        .pipe(transform(function (data) {
          const newData = {};
          Object.entries(data).forEach(([key, value]) => {
            // Filter out empty strings or other falsey values before merging
            if (data[key]) newData[key] = value;
          });
          return newData;
        }))
        .pipe(merge({
          fileName: tr + '.json',
        }))
        .pipe(minify())
        .pipe(gulp.dest(outDir));
    }));
});
tasks.push(taskName);

taskName = 'build-translation-fingerprints';
gulp.task(taskName, ['build-merged-translations'], function () {
  return gulp.src(outDir + '/!(translationFingerprints).json')
    .pipe(rename({
      extname: '',
    }))
    .pipe(hash({
      algorithm: 'md5',
      hashLength: 32,
      template: '<%= name %>-<%= hash %>.json',
    }))
    .pipe(hash.manifest('translationFingerprints.json'))
    .pipe(transform(function (data) {
      Object.keys(data).forEach((key) => {
        data[key] = { fingerprint: data[key] };
      });
      return data;
    }))
    .pipe(gulp.dest(outDir));
});
tasks.push(taskName);

taskName = 'build-translations';
gulp.task(taskName, ['build-translation-fingerprints'], function () {
  return gulp.src([
    'src/translations/translationMetadata.json',
    outDir + '/translationFingerprints.json',
  ])
    .pipe(merge({}))
    .pipe(transform(function (data) {
      const newData = {};
      Object.entries(data).forEach(([key, value]) => {
        // Filter out empty strings or other falsey values before merging
        if (data[key].nativeName) {
          newData[key] = data[key];
        } else {
          console.warn(`Skipping language ${key}. Native name was not translated.`);
        }
        if (data[key]) newData[key] = value;
      });
      return newData;
    }))
    .pipe(insert.wrap('<script>\nwindow.translationMetadata = ', ';\n</script>'))
    .pipe(rename('translationMetadata.html'))
    .pipe(gulp.dest(outDir));
});
tasks.push(taskName);

module.exports = tasks;
