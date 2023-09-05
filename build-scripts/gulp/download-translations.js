import fs from "fs/promises";
import gulp from "gulp";
import path from "path";
import mapStream from "map-stream";
import transform from "gulp-json-transform";
import { LokaliseApi } from "@lokalise/node-api";
import JSZip from "jszip";

const inDir = "translations";
const inDirFrontend = `${inDir}/frontend`;
const inDirBackend = `${inDir}/backend`;
const srcMeta = "src/translations/translationMetadata.json";
const encoding = "utf8";

function hasHtml(data) {
  return /<[a-z][\s\S]*>/i.test(data);
}

function recursiveCheckHasHtml(file, data, errors, recKey) {
  Object.keys(data).forEach(function (key) {
    if (typeof data[key] === "object") {
      const nextRecKey = recKey ? `${recKey}.${key}` : key;
      recursiveCheckHasHtml(file, data[key], errors, nextRecKey);
    } else if (hasHtml(data[key])) {
      errors.push(`HTML found in ${file.path} at key ${recKey}.${key}`);
    }
  });
}

function checkHtml() {
  const errors = [];

  return mapStream(function (file, cb) {
    const content = file.contents;
    let error;
    if (content) {
      if (hasHtml(String(content))) {
        const data = JSON.parse(String(content));
        recursiveCheckHasHtml(file, data, errors);
        if (errors.length > 0) {
          error = errors.join("\r\n");
        }
      }
    }
    cb(error, file);
  });
}

function convertBackendTranslations(data, _file) {
  const output = { component: {} };
  if (!data.component) {
    return output;
  }
  Object.keys(data.component).forEach((domain) => {
    if (!("entity_component" in data.component[domain])) {
      return;
    }
    output.component[domain] = { entity_component: {} };
    Object.keys(data.component[domain].entity_component).forEach((key) => {
      output.component[domain].entity_component[key] =
        data.component[domain].entity_component[key];
    });
  });
  return output;
}

gulp.task("convert-backend-translations", function () {
  return gulp
    .src([`${inDirBackend}/*.json`])
    .pipe(transform((data, file) => convertBackendTranslations(data, file)))
    .pipe(gulp.dest(inDirBackend));
});

gulp.task("check-translations-html", function () {
  return gulp
    .src([`${inDirFrontend}/*.json`, `${inDirBackend}/*.json`])
    .pipe(checkHtml());
});

gulp.task("check-all-files-exist", async function () {
  const file = await fs.readFile(srcMeta, { encoding });
  const meta = JSON.parse(file);
  const writings = [];
  Object.keys(meta).forEach((lang) => {
    writings.push(
      fs.writeFile(`${inDirFrontend}/${lang}.json`, JSON.stringify({}), {
        flag: "wx",
      }),
      fs.writeFile(`${inDirBackend}/${lang}.json`, JSON.stringify({}), {
        flag: "wx",
      })
    );
  });
  await Promise.allSettled(writings);
});

const lokaliseProjects = {
  backend: "130246255a974bd3b5e8a1.51616605",
  frontend: "3420425759f6d6d241f598.13594006",
};

gulp.task("fetch-lokalise", async function () {
  let apiKey;
  try {
    apiKey =
      process.env.LOKALISE_TOKEN ||
      (await fs.readFile(".lokalise_token", { encoding }));
  } catch {
    throw new Error(
      "An Administrator Lokalise API token is required to download the latest set of translations. Place your token in a new file `.lokalise_token` in the repo root directory."
    );
  }
  const lokaliseApi = new LokaliseApi({ apiKey });

  const mkdirPromise = Promise.all([
    fs.mkdir(inDirFrontend, { recursive: true }),
    fs.mkdir(inDirBackend, { recursive: true }),
  ]);

  await Promise.all(
    Object.entries(lokaliseProjects).map(([project, projectId]) =>
      lokaliseApi
        .files()
        .download(projectId, {
          format: "json",
          original_filenames: false,
          replace_breaks: false,
          json_unescaped_slashes: true,
          export_empty_as: "skip",
        })
        .then((download) => fetch(download.bundle_url))
        .then((response) => {
          if (response.status === 200 || response.status === 0) {
            return response.arrayBuffer();
          }
          throw new Error(response.statusText);
        })
        .then(JSZip.loadAsync)
        .then(async (contents) => {
          await mkdirPromise;
          return Promise.all(
            Object.keys(contents.files).map(async (filename) => {
              const file = contents.file(filename);
              if (!file) {
                // no file, probably a directory
                return Promise.resolve();
              }
              return file
                .async("nodebuffer")
                .then((content) =>
                  fs.writeFile(
                    path.join(
                      inDir,
                      project,
                      filename.split("/").splice(-1)[0]
                    ),
                    content,
                    { flag: "w", encoding }
                  )
                );
            })
          );
        })
    )
  );
});

gulp.task(
  "download-translations",
  gulp.series(
    "fetch-lokalise",
    "convert-backend-translations",
    "check-translations-html",
    "check-all-files-exist"
  )
);
