import { createHash } from "crypto";
import { deleteSync } from "del";
import { mkdirSync, readdirSync, readFileSync, renameSync } from "fs";
import { writeFile } from "node:fs/promises";
import gulp from "gulp";
import flatmap from "gulp-flatmap";
import transform from "gulp-json-transform";
import merge from "gulp-merge-json";
import rename from "gulp-rename";
import path from "path";
import vinylBuffer from "vinyl-buffer";
import source from "vinyl-source-stream";
import env from "../env.cjs";
import paths from "../paths.cjs";
import { mapFiles } from "../util.cjs";
import "./fetch-nightly-translations.js";

const inFrontendDir = "translations/frontend";
const inBackendDir = "translations/backend";
const workDir = "build/translations";
const fullDir = workDir + "/full";
const coreDir = workDir + "/core";
const outDir = workDir + "/output";
let mergeBackend = false;

gulp.task(
  "translations-enable-merge-backend",
  gulp.parallel((done) => {
    mergeBackend = true;
    done();
  }, "allow-setup-fetch-nightly-translations")
);

// Panel translations which should be split from the core translations.
const TRANSLATION_FRAGMENTS = Object.keys(
  JSON.parse(
    readFileSync(
      path.resolve(paths.polymer_dir, "src/translations/en.json"),
      "utf-8"
    )
  ).ui.panel
);

function recursiveFlatten(prefix, data) {
  let output = {};
  Object.keys(data).forEach((key) => {
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
      output[key] = value.replace(re_key_reference, (_match, lokalise_key) => {
        const replace = lokalise_key.split("::").reduce((tr, k) => {
          if (!tr) {
            throw Error(
              `Invalid key placeholder ${lokalise_key} in ${file.path}`
            );
          }
          return tr[k];
        }, original);
        if (typeof replace !== "string") {
          throw Error(
            `Invalid key placeholder ${lokalise_key} in ${file.path}`
          );
        }
        return replace;
      });
    }
  });
  return output;
}

gulp.task("clean-translations", async () => deleteSync([workDir]));

gulp.task("ensure-translations-build-dir", async () => {
  mkdirSync(workDir, { recursive: true });
});

gulp.task("create-test-metadata", () =>
  env.isProdBuild()
    ? Promise.resolve()
    : writeFile(
        workDir + "/testMetadata.json",
        JSON.stringify({ test: { nativeName: "Test" } })
      )
);

gulp.task("create-test-translation", () =>
  env.isProdBuild()
    ? Promise.resolve()
    : gulp
        .src(path.join(paths.translations_src, "en.json"))
        .pipe(transform((data, _file) => recursiveEmpty(data)))
        .pipe(rename("test.json"))
        .pipe(gulp.dest(workDir))
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
gulp.task("build-master-translation", () => {
  const src = [path.join(paths.translations_src, "en.json")];

  if (mergeBackend) {
    src.push(path.join(inBackendDir, "en.json"));
  }

  return gulp
    .src(src)
    .pipe(transform((data, file) => lokaliseTransform(data, data, file)))
    .pipe(
      merge({
        fileName: "en.json",
      })
    )
    .pipe(gulp.dest(fullDir));
});

gulp.task("build-merged-translations", () =>
  gulp
    .src([
      inFrontendDir + "/*.json",
      "!" + inFrontendDir + "/en.json",
      ...(env.isProdBuild() ? [] : [workDir + "/test.json"]),
    ])
    .pipe(transform((data, file) => lokaliseTransform(data, data, file)))
    .pipe(
      flatmap((stream, file) => {
        // For each language generate a merged json file. It begins with the master
        // translation as a failsafe for untranslated strings, and merges all parent
        // tags into one file for each specific subtag
        //
        // TODO: This is a naive interpretation of BCP47 that should be improved.
        //       Will be OK for now as long as we don't have anything more complicated
        //       than a base translation + region.
        const tr = path.basename(file.history[0], ".json");
        const subtags = tr.split("-");
        const src = [fullDir + "/en.json"];
        for (let i = 1; i <= subtags.length; i++) {
          const lang = subtags.slice(0, i).join("-");
          if (lang === "test") {
            src.push(workDir + "/test.json");
          } else if (lang !== "en") {
            src.push(inFrontendDir + "/" + lang + ".json");
            if (mergeBackend) {
              src.push(inBackendDir + "/" + lang + ".json");
            }
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
    )
);

let taskName;

const splitTasks = [];
TRANSLATION_FRAGMENTS.forEach((fragment) => {
  taskName = "build-translation-fragment-" + fragment;
  gulp.task(taskName, () =>
    // Return only the translations for this fragment.
    gulp
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
      .pipe(gulp.dest(workDir + "/" + fragment))
  );
  splitTasks.push(taskName);
});

taskName = "build-translation-core";
gulp.task(taskName, () =>
  // Remove the fragment translations from the core translation.
  gulp
    .src(fullDir + "/*.json")
    .pipe(
      transform((data, _file) => {
        TRANSLATION_FRAGMENTS.forEach((fragment) => {
          delete data.ui.panel[fragment];
        });
        delete data.supervisor;
        return data;
      })
    )
    .pipe(gulp.dest(coreDir))
);

splitTasks.push(taskName);

gulp.task("build-flattened-translations", () =>
  // Flatten the split versions of our translations, and move them into outDir
  gulp
    .src(
      TRANSLATION_FRAGMENTS.map(
        (fragment) => workDir + "/" + fragment + "/*.json"
      ).concat(coreDir + "/*.json"),
      { base: workDir }
    )
    .pipe(
      transform((data) =>
        // Polymer.AppLocalizeBehavior requires flattened json
        flatten(data)
      )
    )
    .pipe(
      rename((filePath) => {
        if (filePath.dirname === "core") {
          filePath.dirname = "";
        }
        // In dev we create the file with the fake hash in the filename
        if (!env.isProdBuild()) {
          filePath.basename += "-dev";
        }
      })
    )
    .pipe(gulp.dest(outDir))
);

const fingerprints = {};

gulp.task("build-translation-fingerprints", () => {
  // Fingerprint full file of each language
  const files = readdirSync(fullDir);

  for (let i = 0; i < files.length; i++) {
    fingerprints[files[i].split(".")[0]] = {
      // In dev we create fake hashes
      hash: env.isProdBuild()
        ? createHash("md5")
            .update(readFileSync(path.join(fullDir, files[i]), "utf-8"))
            .digest("hex")
        : "dev",
    };
  }

  // In dev we create the file with the fake hash in the filename
  if (env.isProdBuild()) {
    mapFiles(outDir, ".json", (filename) => {
      const parsed = path.parse(filename);

      // nl.json -> nl-<hash>.json
      if (!(parsed.name in fingerprints)) {
        throw new Error(`Unable to find hash for ${filename}`);
      }

      renameSync(
        filename,
        `${parsed.dir}/${parsed.name}-${fingerprints[parsed.name].hash}${
          parsed.ext
        }`
      );
    });
  }

  const stream = source("translationFingerprints.json");
  stream.write(JSON.stringify(fingerprints));
  process.nextTick(() => stream.end());
  return stream.pipe(vinylBuffer()).pipe(gulp.dest(workDir));
});

gulp.task("build-translation-fragment-supervisor", () =>
  gulp
    .src(fullDir + "/*.json")
    .pipe(transform((data) => data.supervisor))
    .pipe(
      rename((filePath) => {
        // In dev we create the file with the fake hash in the filename
        if (!env.isProdBuild()) {
          filePath.basename += "-dev";
        }
      })
    )
    .pipe(gulp.dest(workDir + "/supervisor"))
);

gulp.task("build-translation-flatten-supervisor", () =>
  gulp
    .src(workDir + "/supervisor/*.json")
    .pipe(
      transform((data) =>
        // Polymer.AppLocalizeBehavior requires flattened json
        flatten(data)
      )
    )
    .pipe(gulp.dest(outDir))
);

gulp.task("build-translation-write-metadata", () =>
  gulp
    .src([
      path.join(paths.translations_src, "translationMetadata.json"),
      ...(env.isProdBuild() ? [] : [workDir + "/testMetadata.json"]),
      workDir + "/translationFingerprints.json",
    ])
    .pipe(merge({}))
    .pipe(
      transform((data) => {
        const newData = {};
        Object.entries(data).forEach(([key, value]) => {
          // Filter out translations without native name.
          if (value.nativeName) {
            newData[key] = value;
          } else {
            console.warn(
              `Skipping language ${key}. Native name was not translated.`
            );
          }
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
    .pipe(gulp.dest(workDir))
);

gulp.task(
  "create-translations",
  gulp.series(
    gulp.parallel("create-test-metadata", "create-test-translation"),
    "build-master-translation",
    "build-merged-translations",
    gulp.parallel(...splitTasks),
    "build-flattened-translations"
  )
);

gulp.task(
  "build-translations",
  gulp.series(
    gulp.parallel(
      "fetch-nightly-translations",
      gulp.series("clean-translations", "ensure-translations-build-dir")
    ),
    "create-translations",
    "build-translation-fingerprints",
    "build-translation-write-metadata"
  )
);

gulp.task(
  "build-supervisor-translations",
  gulp.series(
    gulp.parallel(
      "fetch-nightly-translations",
      gulp.series("clean-translations", "ensure-translations-build-dir")
    ),
    gulp.parallel("create-test-metadata", "create-test-translation"),
    "build-master-translation",
    "build-merged-translations",
    "build-translation-fragment-supervisor",
    "build-translation-flatten-supervisor",
    "build-translation-fingerprints",
    "build-translation-write-metadata"
  )
);
