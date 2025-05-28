import { LokaliseApi } from "@lokalise/node-api";
import { dest, series, src } from "gulp";
import transform from "gulp-json-transform";
import JSZip from "jszip";
import mapStream from "map-stream";
import fs from "node:fs/promises";
import path from "node:path";

const inDir = "translations";
const inDirFrontend = `${inDir}/frontend`;
const inDirBackend = `${inDir}/backend`;
const srcMeta = "src/translations/translationMetadata.json";
const encoding = "utf8";

const hasHtml = (data) => /<\S*>/i.test(data);

const recursiveCheckHasHtml = (
  file,
  data,
  errors: string[],
  recKey?: string
) => {
  Object.keys(data).forEach(function (key) {
    if (typeof data[key] === "object") {
      const nextRecKey = recKey ? `${recKey}.${key}` : key;
      recursiveCheckHasHtml(file, data[key], errors, nextRecKey);
    } else if (hasHtml(data[key])) {
      errors.push(`HTML found in ${file.path} at key ${recKey}.${key}`);
    }
  });
};

const checkHtml = () => {
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
};

const convertBackendTranslationsTransform = (data, _file) => {
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
};

const convertBackendTranslations = () =>
  src([`${inDirBackend}/*.json`])
    .pipe(
      transform((data, file) => convertBackendTranslationsTransform(data, file))
    )
    .pipe(dest(inDirBackend));

const checkTranslationsHtml = () =>
  src([`${inDirFrontend}/*.json`, `${inDirBackend}/*.json`]).pipe(checkHtml());

const checkAllFilesExist = async () => {
  const file = await fs.readFile(srcMeta, { encoding });
  const meta = JSON.parse(file);
  const writings: Promise<void>[] = [];
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
};

const lokaliseProjects = {
  backend: "130246255a974bd3b5e8a1.51616605",
  frontend: "3420425759f6d6d241f598.13594006",
};

const fetchLokalise = async () => {
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
          filter_data: ["verified"],
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
        .catch((err) => {
          console.error(err);
          throw err;
        })
    )
  );
};

export const downloadTranslations = series(
  fetchLokalise,
  convertBackendTranslations,
  checkTranslationsHtml,
  checkAllFilesExist
);
