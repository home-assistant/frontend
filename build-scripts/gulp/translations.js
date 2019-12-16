const del = require("del");
const path = require("path");
const gulp = require("gulp");
const fs = require("fs");
const foreach = require("gulp-foreach");
const hash = require("gulp-hash");
const hashFilename = require("gulp-hash-filename");
const merge = require("gulp-merge-json");
const minify = require("gulp-jsonminify");
const rename = require("gulp-rename");
const transform = require("gulp-json-transform");

const inDir = "translations";
const workDir = "build-translations";
const fullDir = workDir + "/full";
const coreDir = workDir + "/core";
const outDir = workDir + "/output";

String.prototype.rsplit = function(sep, maxsplit) {
  var split = this.split(sep);
  return maxsplit
    ? [split.slice(0, -maxsplit).join(sep)].concat(split.slice(-maxsplit))
    : split;
};

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
  "page-demo",
  "page-onboarding",
  "developer-tools",
];

const tasks = [];

function recursiveFlatten(prefix, data) {
  let output = {};
  Object.keys(data).forEach(function(key) {
    if (typeof data[key] === "object") {
      output = {
        ...output,
        ...recursiveFlatten(prefix + key + ".", data[key]),
      };
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

function recursiveEmpty(data) {
  const newData = {};
  Object.keys(data).forEach((key) => {
    if (data[key]) {
      if (typeof data[key] === "object") {
        newData[key] = recursiveEmpty(data[key]);
      } else {
        newData[key] = "TRANSLATED";
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
function lokaliseTransform(data, original, file) {
  const output = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof Object) {
      output[key] = lokaliseTransform(value, original, file);
    } else {
      output[key] = value.replace(re_key_reference, (match, key) => {
        const replace = key.split("::").reduce((tr, k) => tr[k], original);
        if (typeof replace !== "string") {
          throw Error(`Invalid key placeholder ${key} in ${file.path}`);
        }
        return replace;
      });
    }
  });
  return output;
}

let taskName = "clean-translations";
gulp.task(taskName, function() {
  return del([`${outDir}/**/*.json`]);
});
tasks.push(taskName);

gulp.task("ensure-translations-build-dir", (done) => {
  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir);
  }
  done();
});

taskName = "create-test-metadata";
gulp.task(
  taskName,
  gulp.series("ensure-translations-build-dir", function writeTestMetaData(cb) {
    fs.writeFile(
      workDir + "/testMetadata.json",
      JSON.stringify({
        test: {
          nativeName: "Test",
        },
      }),
      cb
    );
  })
);
tasks.push(taskName);

taskName = "create-test-translation";
gulp.task(
  taskName,
  gulp.series("create-test-metadata", function() {
    return gulp
      .src("src/translations/en.json")
      .pipe(
        transform(function(data, file) {
          return recursiveEmpty(data);
        })
      )
      .pipe(rename("test.json"))
      .pipe(gulp.dest(workDir));
  })
);
tasks.push(taskName);

/**
 * This task will build a master translation file, to be used as the base for
 * all languages. This starts with src/translations/en.json, and replaces all
 * Lokalise key placeholders with their target values. Under normal circumstances,
 * this will be the same as translations/en.json However, we build it here to
 * facilitate both making changes in development mode, and to ensure that the
 * project is buildable immediately after merging new translation keys, since
 * the Lokalise update to translations/en.json will not happen immediately.
 */
taskName = "build-master-translation";
gulp.task(
  taskName,
  gulp.series("clean-translations", function() {
    return gulp
      .src("src/translations/en.json")
      .pipe(
        transform(function(data, file) {
          return lokaliseTransform(data, data, file);
        })
      )
      .pipe(rename("translationMaster.json"))
      .pipe(gulp.dest(workDir));
  })
);
tasks.push(taskName);

taskName = "build-merged-translations";
gulp.task(
  taskName,
  gulp.series("build-master-translation", function() {
    return gulp
      .src([inDir + "/*.json", workDir + "/test.json"], { allowEmpty: true })
      .pipe(
        transform(function(data, file) {
          return lokaliseTransform(data, data, file);
        })
      )
      .pipe(
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
            if (lang === "test") {
              src.push(workDir + "/test.json");
            } else if (lang !== "en") {
              src.push(inDir + "/" + lang + ".json");
            }
          }
          return gulp
            .src(src, { allowEmpty: true })
            .pipe(transform((data) => emptyFilter(data)))
            .pipe(
              merge({
                fileName: tr + ".json",
              })
            )
            .pipe(gulp.dest(fullDir));
        })
      );
  })
);
tasks.push(taskName);

const splitTasks = [];
TRANSLATION_FRAGMENTS.forEach((fragment) => {
  taskName = "build-translation-fragment-" + fragment;
  gulp.task(
    taskName,
    gulp.series("build-merged-translations", function() {
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
    })
  );
  tasks.push(taskName);
  splitTasks.push(taskName);
});

taskName = "build-translation-core";
gulp.task(
  taskName,
  gulp.series("build-merged-translations", function() {
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
  })
);
tasks.push(taskName);
splitTasks.push(taskName);

taskName = "build-flattened-translations";
gulp.task(
  taskName,
  gulp.series(...splitTasks, function() {
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
      .pipe(hashFilename())
      .pipe(
        rename((filePath) => {
          if (filePath.dirname === "core") {
            filePath.dirname = "";
          }
        })
      )
      .pipe(gulp.dest(outDir));
  })
);
tasks.push(taskName);

taskName = "build-translation-fingerprints";
gulp.task(
  taskName,
  gulp.series("build-flattened-translations", function() {
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
          template: "<%= name %>.json",
        })
      )
      .pipe(hash.manifest("translationFingerprints.json"))
      .pipe(
        transform(function(data) {
          // After generating fingerprints of our translation files, consolidate
          // all translation fragment fingerprints under the translation name key
          const newData = {};
          Object.entries(data).forEach(([key, value]) => {
            const [path, _md5] = key.rsplit("-", 1);
            // let translation = key;
            let translation = path;
            const parts = translation.split("/");
            if (parts.length === 2) {
              translation = parts[1];
            }
            if (!(translation in newData)) {
              newData[translation] = {
                fingerprints: {},
              };
            }
            newData[translation].fingerprints[path] = value;
          });
          return newData;
        })
      )
      .pipe(gulp.dest(workDir));
  })
);
tasks.push(taskName);

taskName = "build-translations";
gulp.task(
  taskName,
  gulp.series("build-translation-fingerprints", function() {
    return gulp
      .src(
        [
          "src/translations/translationMetadata.json",
          workDir + "/testMetadata.json",
          workDir + "/translationFingerprints.json",
        ],
        { allowEmpty: true }
      )
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
  })
);
tasks.push(taskName);

module.exports = tasks;
