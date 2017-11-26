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
  let output = {};
  Object.keys(data).forEach(function (key) {
    if (typeof (data[key]) === 'object') {
      output = Object.assign({}, output, recursiveFlatten(prefix + key + '.', data[key]));
    } else {
      output[prefix + key] = data[key];
    }
  });
  return output;
}

function flatten(data) {
  return recursiveFlatten('', data);
}

function emptyFilter(data) {
  const newData = {};
  Object.keys(data).forEach(key => {
    if (data[key]) {
      if (typeof (data[key]) === 'object') {
        newData[key] = emptyFilter(data[key]);
      } else {
        newData[key] = data[key];
      }
    }
  });
  return newData;
}

/**
 * Replace Lokalise key placeholders with their actual values.
 *
 * We duplicate the behavior of Lokalise here so that placeholders can
 * be included in src/translations/en.json, but still be usable while
 * developing locally.
 *
 * @link https://docs.lokalise.co/article/KO5SZWLLsy-key-referencing
 */
const re_key_reference = /\[%key:([^%]+)%\]/;
function lokalise_transform (data, original) {
  const output = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof Object) {
      output[key] = lokalise_transform(value, original);
    } else {
      output[key] = value.replace(re_key_reference, (match, key) => {
        const replace = key.split('::').reduce((tr, k) => tr[k], original);
        if (typeof replace !== 'string') {
          throw Error(`Invalid key placeholder ${key} in src/translations/en.json`);
        }
        return replace;
      });
    }
  });
  return output;
}

/**
 * This task will build a master translation file, to be used as the base for
 * all languages. This starts with src/translations/en.json, and replaces all
 * Lokalise key placeholders with their target values. Under normal circumstances,
 * this will be the same as translations/en.json However, we build it here to
 * facilitate both making changes in development mode, and to ensure that the
 * project is buildable immediately after merging new translation keys, since
 * the Lokalise update to translations/en.json will not happen immediately.
 */
let taskName = 'build-master-translation';
gulp.task(taskName, function () {
  return gulp.src('src/translations/en.json')
    .pipe(transform(function(data, file) {
      return lokalise_transform(data, data);
    }))
    .pipe(rename('translationMaster.json'))
    .pipe(gulp.dest(outDir));
});
tasks.push(taskName);

taskName = 'build-merged-translations';
gulp.task(taskName, ['build-master-translation'], function () {
  return gulp.src(inDir + '/*.json')
    .pipe(foreach(function(stream, file) {
      // For each language generate a merged json file. It begins with the master
      // translation as a failsafe for untranslated strings, and merges all parent
      // tags into one file for each specific subtag
      //
      // TODO: This is a naive interpretation of BCP47 that should be improved.
      //       Will be OK for now as long as we don't have anything more complicated
      //       than a base translation + region.
      const tr = path.basename(file.history[0], '.json');
      const subtags = tr.split('-');
      const src = [outDir + '/translationMaster.json'];
      for (let i = 1; i <= subtags.length; i++) {
        const lang = subtags.slice(0, i).join('-');
        src.push(inDir + '/' + lang + '.json');
      }
      return gulp.src(src)
        .pipe(transform(data => emptyFilter(data)))
        .pipe(merge({
          fileName: tr + '.json',
        }))
        .pipe(gulp.dest(outDir));
    }));
});
tasks.push(taskName);

taskName = 'build-flattened-translations';
gulp.task(taskName, ['build-merged-translations'], function () {
  return gulp.src(outDir + '/!(translationFingerprints|translationMaster).json')
    .pipe(transform(function (data) {
      // Polymer.AppLocalizeBehavior requires flattened json
      return flatten(data);
    }))
    .pipe(minify())
    .pipe(gulp.dest(outDir));
});
tasks.push(taskName);

taskName = 'build-translation-fingerprints';
gulp.task(taskName, ['build-flattened-translations'], function () {
  return gulp.src(outDir + '/!(translationFingerprints|translationMaster).json')
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
        // Filter out translations without native name.
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
