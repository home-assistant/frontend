const path = require("path");
const gulp = require("gulp");
const foreach = require("gulp-foreach");
const hash = require("gulp-hash");
const insert = require("gulp-insert");
const merge = require("gulp-merge-json");
const minify = require("gulp-jsonminify");
const rename = require("gulp-rename");
const transform = require("gulp-json-transform");

const inDir = "translations";
const workDir = "build-translations";
const fullDir = workDir + "/full";
const coreDir = workDir + "/core";
const outDir = workDir + "/output";

// Panel translations which should be split from the core translations. These
// should mirror the fragment definitions in polymer.json, so that we load
// additional resources at equivalent points.
const TRANSLATION_FRAGMENTS = [
  "config",
  "history",
  "logbook",
  "mailbox",
  "profile",
  "shopping-list",
  "page-authorize",
  "page-onboarding",
];

const tasks = [];

function recursiveFlatten(prefix, data) {
  let output = {};
  Object.keys(data).forEach(function(key) {
    if (typeof data[key] === "object") {
      output = Object.assign(
        {},
        output,
        recursiveFlatten(prefix + key + ".", data[key])
      );
    } else {
      output[prefix + key] = data[key];
    }
  });
  return output;
}

function flatten(data) {
  return recursiveFlatten("", data);
}

function emptyFilter(data) {
  const newData = {};
  Object.keys(data).forEach((key) => {
    if (data[key]) {
      if (typeof data[key] === "object") {
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
function lokalise_transform(data, original) {
  const output = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof Object) {
      output[key] = lokalise_transform(value, original);
    } else {
      output[key] = value.replace(re_key_reference, (match, key) => {
        const replace = key.split("::").reduce((tr, k) => tr[k], original);
        if (typeof replace !== "string") {
          throw Error(
            `Invalid key placeholder ${key} in src/translations/en.json`
          );
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
let taskName = "build-master-translation";
gulp.task(taskName, function() {
  return gulp
    .src("src/translations/en.json")
    .pipe(
      transform(function(data, file) {
        return lokalise_transform(data, data);
      })
    )
    .pipe(rename("translationMaster.json"))
    .pipe(gulp.dest(workDir));
});
tasks.push(taskName);

taskName = "build-merged-translations";
gulp.task(taskName, ["build-master-translation"], function() {
  return gulp.src(inDir + "/*.json").pipe(
    foreach(function(stream, file) {
      // For each language generate a merged json file. It begins with the master
      // translation as a failsafe for untranslated strings, and merges all parent
      // tags into one file for each specific subtag
      //
      // TODO: This is a naive interpretation of BCP47 that should be improved.
      //       Will be OK for now as long as we don't have anything more complicated
      //       than a base translation + region.
      const tr = path.basename(file.history[0], ".json");
      const subtags = tr.split("-");
      const src = [workDir + "/translationMaster.json"];
      for (let i = 1; i <= subtags.length; i++) {
        const lang = subtags.slice(0, i).join("-");
        src.push(inDir + "/" + lang + ".json");
      }
      return gulp
        .src(src)
        .pipe(transform((data) => emptyFilter(data)))
        .pipe(
          merge({
            fileName: tr + ".json",
          })
        )
        .pipe(gulp.dest(fullDir));
    })
  );
});
tasks.push(taskName);

const splitTasks = [];
TRANSLATION_FRAGMENTS.forEach((fragment) => {
  taskName = "build-translation-fragment-" + fragment;
  gulp.task(taskName, ["build-merged-translations"], function() {
    // Return only the translations for this fragment.
    return gulp
      .src(fullDir + "/*.json")
      .pipe(
        transform((data) => ({
          ui: {
            panel: {
              [fragment]: data.ui.panel[fragment],
            },
          },
        }))
      )
      .pipe(gulp.dest(workDir + "/" + fragment));
  });
  tasks.push(taskName);
  splitTasks.push(taskName);
});

taskName = "build-translation-core";
gulp.task(taskName, ["build-merged-translations"], function() {
  // Remove the fragment translations from the core translation.
  return gulp
    .src(fullDir + "/*.json")
    .pipe(
      transform((data) => {
        TRANSLATION_FRAGMENTS.forEach((fragment) => {
          delete data.ui.panel[fragment];
        });
        return data;
      })
    )
    .pipe(gulp.dest(coreDir));
});
tasks.push(taskName);
splitTasks.push(taskName);

taskName = "build-flattened-translations";
gulp.task(taskName, splitTasks, function() {
  // Flatten the split versions of our translations, and move them into outDir
  return gulp
    .src(
      TRANSLATION_FRAGMENTS.map(
        (fragment) => workDir + "/" + fragment + "/*.json"
      ).concat(coreDir + "/*.json"),
      { base: workDir }
    )
    .pipe(
      transform(function(data) {
        // Polymer.AppLocalizeBehavior requires flattened json
        return flatten(data);
      })
    )
    .pipe(minify())
    .pipe(
      rename((filePath) => {
        if (filePath.dirname === "core") {
          filePath.dirname = "";
        }
      })
    )
    .pipe(gulp.dest(outDir));
});
tasks.push(taskName);

taskName = "build-translation-fingerprints";
gulp.task(taskName, ["build-flattened-translations"], function() {
  return gulp
    .src(outDir + "/**/*.json")
    .pipe(
      rename({
        extname: "",
      })
    )
    .pipe(
      hash({
        algorithm: "md5",
        hashLength: 32,
        template: "<%= name %>-<%= hash %>.json",
      })
    )
    .pipe(hash.manifest("translationFingerprints.json"))
    .pipe(
      transform(function(data) {
        // After generating fingerprints of our translation files, consolidate
        // all translation fragment fingerprints under the translation name key
        const newData = {};
        Object.entries(data).forEach(([key, value]) => {
          const parts = key.split("/");
          let translation = key;
          if (parts.length === 2) {
            translation = parts[1];
          }
          if (!(translation in newData)) {
            newData[translation] = {
              fingerprints: {},
            };
          }
          newData[translation].fingerprints[key] = value;
        });
        return newData;
      })
    )
    .pipe(gulp.dest(workDir));
});
tasks.push(taskName);

taskName = "build-translations";
gulp.task(taskName, ["build-translation-fingerprints"], function() {
  return gulp
    .src([
      "src/translations/translationMetadata.json",
      workDir + "/translationFingerprints.json",
    ])
    .pipe(merge({}))
    .pipe(
      transform(function(data) {
        const newData = {};
        Object.entries(data).forEach(([key, value]) => {
          // Filter out translations without native name.
          if (data[key].nativeName) {
            newData[key] = data[key];
          } else {
            console.warn(
              `Skipping language ${key}. Native name was not translated.`
            );
          }
          if (data[key]) newData[key] = value;
        });
        return newData;
      })
    )
    .pipe(
      transform((data) => ({
        fragments: TRANSLATION_FRAGMENTS,
        translations: data,
      }))
    )
    .pipe(rename("translationMetadata.json"))
    .pipe(gulp.dest(workDir));
});
tasks.push(taskName);

module.exports = tasks;
