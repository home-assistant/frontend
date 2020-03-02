const crypto = require("crypto");
const del = require("del");
const path = require("path");
const source = require("vinyl-source-stream");
const vinylBuffer = require("vinyl-buffer");
const gulp = require("gulp");
const fs = require("fs");
const foreach = require("gulp-foreach");
const merge = require("gulp-merge-json");
const minify = require("gulp-jsonminify");
const rename = require("gulp-rename");
const transform = require("gulp-json-transform");
const { mapFiles } = require("../util");
const env = require("../env");

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

gulp.task("clean-translations", function() {
  return del([workDir]);
});

gulp.task("ensure-translations-build-dir", (done) => {
  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir);
  }
  done();
});

gulp.task("create-test-metadata", function(cb) {
  fs.writeFile(
    workDir + "/testMetadata.json",
    JSON.stringify({
      test: {
        nativeName: "Test",
      },
    }),
    cb
  );
});

gulp.task(
  "create-test-translation",
  gulp.series("create-test-metadata", function createTestTranslation() {
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

/**
 * This task will build a master translation file, to be used as the base for
 * all languages. This starts with src/translations/en.json, and replaces all
 * Lokalise key placeholders with their target values. Under normal circumstances,
 * this will be the same as translations/en.json However, we build it here to
 * facilitate both making changes in development mode, and to ensure that the
 * project is buildable immediately after merging new translation keys, since
 * the Lokalise update to translations/en.json will not happen immediately.
 */
gulp.task("build-master-translation", function() {
  return gulp
    .src("src/translations/en.json")
    .pipe(
      transform(function(data, file) {
        return lokaliseTransform(data, data, file);
      })
    )
    .pipe(rename("translationMaster.json"))
    .pipe(gulp.dest(workDir));
});

gulp.task("build-merged-translations", function() {
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
});

var taskName;

const splitTasks = [];
TRANSLATION_FRAGMENTS.forEach((fragment) => {
  taskName = "build-translation-fragment-" + fragment;
  gulp.task(taskName, function() {
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
  splitTasks.push(taskName);
});

taskName = "build-translation-core";
gulp.task(taskName, function() {
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

splitTasks.push(taskName);

gulp.task("build-flattened-translations", function() {
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

const fingerprints = {};

gulp.task(
  "build-translation-fingerprints",
  function fingerprintTranslationFiles() {
    // Fingerprint full file of each language
    const files = fs.readdirSync(fullDir);
    for (let i = 0; i < files.length; i++) {
      fingerprints[files[i].split(".")[0]] = {
        // In dev we create fake hashes
        hash: env.isProdBuild
          ? crypto
              .createHash("md5")
              .update(fs.readFileSync(path.join(fullDir, files[i]), "utf-8"))
              .digest("hex")
          : "dev",
      };
    }

    mapFiles(outDir, ".json", (filename) => {
      const parsed = path.parse(filename);

      // nl.json -> nl-<hash>.json
      if (!(parsed.name in fingerprints)) {
        throw new Error(`Unable to find hash for ${filename}`);
      }

      fs.renameSync(
        filename,
        `${parsed.dir}/${parsed.name}-${fingerprints[parsed.name].hash}${
          parsed.ext
        }`
      );
    });

    const stream = source("translationFingerprints.json");
    stream.write(JSON.stringify(fingerprints));
    process.nextTick(() => stream.end());
    return stream.pipe(vinylBuffer()).pipe(gulp.dest(workDir));
  }
);

gulp.task(
  "build-translations",
  gulp.series(
    "clean-translations",
    "ensure-translations-build-dir",
    env.isProdBuild ? (done) => done() : "create-test-translation",
    "build-master-translation",
    "build-merged-translations",
    gulp.parallel(...splitTasks),
    "build-flattened-translations",
    "build-translation-fingerprints",
    function writeMetadata() {
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
    }
  )
);
