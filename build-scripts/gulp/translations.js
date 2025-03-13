/* eslint-disable max-classes-per-file */

import { deleteAsync } from "del";
import { glob } from "glob";
import gulp from "gulp";
import rename from "gulp-rename";
import merge from "lodash.merge";
import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { PassThrough, Transform } from "node:stream";
import { finished } from "node:stream/promises";
import env from "../env.cjs";
import paths from "../paths.cjs";
import "./fetch-nightly-translations.js";

const inFrontendDir = "translations/frontend";
const inBackendDir = "translations/backend";
const workDir = "build/translations";
const outDir = join(workDir, "output");
const EN_SRC = join(paths.translations_src, "en.json");
const TEST_LOCALE = "en-x-test";

let mergeBackend = false;

gulp.task(
  "translations-enable-merge-backend",
  gulp.parallel(async () => {
    mergeBackend = true;
  }, "allow-setup-fetch-nightly-translations")
);

// Transform stream to apply a function on Vinyl JSON files (buffer mode only).
// The provided function can either return a new object, or an array of
// [object, subdirectory] pairs for fragmentizing the JSON.
class CustomJSON extends Transform {
  constructor(func, reviver = null) {
    super({ objectMode: true });
    this._func = func;
    this._reviver = reviver;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  async _transform(file, _, callback) {
    let obj = JSON.parse(file.contents.toString(), this._reviver);
    if (this._func) obj = this._func(obj, file.path);
    for (const [outObj, dir] of Array.isArray(obj) ? obj : [[obj, ""]]) {
      const outFile = file.clone({ contents: false });
      outFile.contents = Buffer.from(JSON.stringify(outObj));
      outFile.dirname += `/${dir}`;
      this.push(outFile);
    }
    callback(null);
  }
}

// Transform stream to merge Vinyl JSON files (buffer mode only).
class MergeJSON extends Transform {
  _objects = [];

  constructor(stem, startObj = {}, reviver = null) {
    super({ objectMode: true, allowHalfOpen: false });
    this._stem = stem;
    this._startObj = structuredClone(startObj);
    this._reviver = reviver;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  async _transform(file, _, callback) {
    this._objects.push(JSON.parse(file.contents.toString(), this._reviver));
    if (!this._outFile) this._outFile = file.clone({ contents: false });
    callback(null);
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  async _flush(callback) {
    const mergedObj = merge(this._startObj, ...this._objects);
    this._outFile.contents = Buffer.from(JSON.stringify(mergedObj));
    this._outFile.stem = this._stem;
    callback(null, this._outFile);
  }
}

// Utility to flatten object keys to single level using separator
const flatten = (data, prefix = "", sep = ".") => {
  const output = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "object") {
      Object.assign(output, flatten(value, prefix + key + sep, sep));
    } else {
      output[prefix + key] = value;
    }
  }
  return output;
};

// Filter functions that can be passed directly to JSON.parse()
const emptyReviver = (_key, value) => value || undefined;
const testReviver = (_key, value) =>
  value && typeof value === "string" ? "TRANSLATED" : value;

/**
 * Replace Lokalise key placeholders with their actual values.
 *
 * We duplicate the behavior of Lokalise here so that placeholders can
 * be included in src/translations/en.json, but still be usable while
 * developing locally.
 *
 * @link https://docs.lokalise.com/en/articles/1400528-key-referencing
 */
const KEY_REFERENCE = /\[%key:([^%]+)%\]/;
const lokaliseTransform = (data, path, original = data) => {
  const output = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "object") {
      output[key] = lokaliseTransform(value, path, original);
    } else {
      output[key] = value.replace(KEY_REFERENCE, (_match, lokalise_key) => {
        const replace = lokalise_key.split("::").reduce((tr, k) => {
          if (!tr) {
            throw Error(`Invalid key placeholder ${lokalise_key} in ${path}`);
          }
          return tr[k];
        }, original);
        if (typeof replace !== "string") {
          throw Error(`Invalid key placeholder ${lokalise_key} in ${path}`);
        }
        return replace;
      });
    }
  }
  return output;
};

gulp.task("clean-translations", () => deleteAsync([workDir]));

const makeWorkDir = () => mkdir(workDir, { recursive: true });

const createTestTranslation = () =>
  env.isProdBuild()
    ? Promise.resolve()
    : gulp
        .src(EN_SRC)
        .pipe(new CustomJSON(null, testReviver))
        .pipe(rename(`${TEST_LOCALE}.json`))
        .pipe(gulp.dest(workDir));

/**
 * This task will build a master translation file, to be used as the base for
 * all languages. This starts with src/translations/en.json, and replaces all
 * Lokalise key placeholders with their target values. Under normal circumstances,
 * this will be the same as translations/en.json However, we build it here to
 * facilitate both making changes in development mode, and to ensure that the
 * project is buildable immediately after merging new translation keys, since
 * the Lokalise update to translations/en.json will not happen immediately.
 */
const createMasterTranslation = () =>
  gulp
    .src([EN_SRC, ...(mergeBackend ? [`${inBackendDir}/en.json`] : [])])
    .pipe(new CustomJSON(lokaliseTransform))
    .pipe(new MergeJSON("en"))
    .pipe(gulp.dest(workDir));

const FRAGMENTS = ["base"];

const setFragment = (fragment) => async () => {
  FRAGMENTS[0] = fragment;
};

const panelFragment = (fragment) =>
  fragment !== "base" &&
  fragment !== "supervisor" &&
  fragment !== "landing-page";

const HASHES = new Map();

const createTranslations = async () => {
  // Parse and store the master to avoid repeating this for each locale, then
  // add the panel fragments when processing the app.
  const enMaster = JSON.parse(await readFile(`${workDir}/en.json`, "utf-8"));
  if (FRAGMENTS[0] === "base") {
    FRAGMENTS.push(...Object.keys(enMaster.ui.panel));
  }

  // The downstream pipeline is setup first.  It hashes the merged data for
  // each locale, then fragmentizes and flattens the data for final output.
  const translationFiles = await glob([
    `${inFrontendDir}/!(en).json`,
    ...(env.isProdBuild() ? [] : [`${workDir}/${TEST_LOCALE}.json`]),
  ]);
  const hashStream = new Transform({
    objectMode: true,
    transform: async (file, _, callback) => {
      const hash = env.isProdBuild()
        ? createHash("md5").update(file.contents).digest("hex")
        : "dev";
      HASHES.set(file.stem, hash);
      file.stem += `-${hash}`;
      callback(null, file);
    },
  }).setMaxListeners(translationFiles.length + 1);
  const fragmentsStream = hashStream
    .pipe(
      new CustomJSON((data) =>
        FRAGMENTS.map((fragment) => {
          switch (fragment) {
            case "base":
              // Remove the panels and supervisor to create the base translations
              return [
                flatten({
                  ...data,
                  ui: { ...data.ui, panel: undefined },
                  supervisor: undefined,
                }),
                "",
              ];
            case "supervisor":
              // Supervisor key is at the top level
              return [flatten(data.supervisor), ""];
            case "landing-page":
              // landing-page key is at the top level
              return [flatten(data["landing-page"]), ""];
            default:
              // Create a fragment with only the given panel
              return [
                flatten(data.ui.panel[fragment], `ui.panel.${fragment}.`),
                fragment,
              ];
          }
        })
      )
    )
    .pipe(gulp.dest(outDir));

  // Send the English master downstream first, then for each other locale
  // generate merged JSON data to continue piping. It begins with the master
  // translation as a failsafe for untranslated strings, and merges all parent
  // tags into one file for each specific subtag
  //
  // TODO: This is a naive interpretation of BCP47 that should be improved.
  //       Will be OK for now as long as we don't have anything more complicated
  // than a base translation + region.
  const masterStream = gulp
    .src(`${workDir}/en.json`)
    .pipe(new PassThrough({ objectMode: true }));
  masterStream.pipe(hashStream, { end: false });
  const mergesFinished = [finished(masterStream)];
  for (const translationFile of translationFiles) {
    const locale = basename(translationFile, ".json");
    const subtags = locale.split("-");
    const mergeFiles = [];
    for (let i = 1; i <= subtags.length; i++) {
      const lang = subtags.slice(0, i).join("-");
      if (lang === TEST_LOCALE) {
        mergeFiles.push(`${workDir}/${TEST_LOCALE}.json`);
      } else if (lang !== "en") {
        mergeFiles.push(`${inFrontendDir}/${lang}.json`);
        if (mergeBackend) {
          mergeFiles.push(`${inBackendDir}/${lang}.json`);
        }
      }
    }
    const mergeStream = gulp
      .src(mergeFiles, { allowEmpty: true })
      .pipe(new MergeJSON(locale, enMaster, emptyReviver));
    mergesFinished.push(finished(mergeStream));
    mergeStream.pipe(hashStream, { end: false });
  }

  // Wait for all merges to finish, then it's safe to end writing to the
  // downstream pipeline and wait for all fragments to finish writing.
  await Promise.all(mergesFinished);
  hashStream.end();
  await finished(fragmentsStream);
};

const writeTranslationMetaData = () =>
  gulp
    .src([`${paths.translations_src}/translationMetadata.json`])
    .pipe(
      new CustomJSON((meta) => {
        // Add the test translation in development.
        if (!env.isProdBuild()) {
          meta[TEST_LOCALE] = { nativeName: "Translation Test" };
        }
        // Filter out locales without a native name, and add the hashes.
        for (const locale of Object.keys(meta)) {
          if (!meta[locale].nativeName) {
            meta[locale] = undefined;
            console.warn(
              `Skipping locale ${locale} because native name is not translated.`
            );
          } else {
            meta[locale].hash = HASHES.get(locale);
          }
        }
        return {
          fragments: FRAGMENTS.filter(panelFragment),
          translations: meta,
        };
      })
    )
    .pipe(gulp.dest(workDir));

gulp.task(
  "build-translations",
  gulp.series(
    gulp.parallel(
      "fetch-nightly-translations",
      gulp.series("clean-translations", makeWorkDir)
    ),
    createTestTranslation,
    createMasterTranslation,
    createTranslations,
    writeTranslationMetaData
  )
);

gulp.task(
  "build-supervisor-translations",
  gulp.series(setFragment("supervisor"), "build-translations")
);

gulp.task(
  "build-landing-page-translations",
  gulp.series(setFragment("landing-page"), "build-translations")
);
