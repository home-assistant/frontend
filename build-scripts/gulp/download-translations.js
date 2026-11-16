import fs from "fs/promises";
import gulp from "gulp";
import path from "path";
import mapStream from "map-stream";
import transform from "gulp-json-transform";
import { LokaliseApi } from "@lokalise/node-api";
import JSZip from "jszip";
import { SERVICE_DOMAINS } from "./gen-demo-core-data.js";

const inDir = "translations";
const inDirFrontend = `${inDir}/frontend`;
const inDirBackend = `${inDir}/backend`;
const srcMeta = "src/translations/translationMetadata.json";
const encoding = "utf8";

function hasHtml(data) {
  return /<\S*>/i.test(data);
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
  // Keep the entity domains and the domains with automation triggers or
  // conditions, so the demo can show states and describe automations. Only
  // keep the services of the domains whose services the demo mocks.
  Object.keys(data.component).forEach((domain) => {
    const {
      entity_component,
      services,
      triggers,
      conditions,
      selector,
      title,
    } = data.component[domain];
    if (
      !entity_component &&
      !triggers &&
      !conditions &&
      !SERVICE_DOMAINS.includes(domain)
    ) {
      return;
    }
    output.component[domain] = {
      entity_component,
      services: SERVICE_DOMAINS.includes(domain) ? services : undefined,
      triggers,
      conditions,
      selector,
      title,
    };
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

const POLL_INTERVAL_MS = 1000;

/* eslint-disable no-await-in-loop */
async function pollProcess(lokaliseApi, projectId, processId) {
  while (true) {
    const process = await lokaliseApi
      .queuedProcesses()
      .get(processId, { project_id: projectId });

    const project =
      projectId === lokaliseProjects.backend ? "backend" : "frontend";

    if (process.status === "finished") {
      console.log(`Lokalise export process for ${project} finished`);
      return process;
    }

    if (process.status === "failed" || process.status === "cancelled") {
      throw new Error(
        `Lokalise export process for ${project} ${process.status}: ${process.message}`
      );
    }

    console.log(
      `Lokalise export process for ${project} in progress...`,
      process.status,
      process.details?.items_to_process
        ? `${Math.round(((process.details.items_processed || 0) / process.details.items_to_process) * 100)}% (${process.details.items_processed}/${process.details.items_to_process})`
        : ""
    );

    await new Promise((resolve) => {
      setTimeout(resolve, POLL_INTERVAL_MS);
    });
  }
}
/* eslint-enable no-await-in-loop */

const DRAFTS_ACCEPTED_KEYS = [
  // Written per language rather than translated from English, so an English edit doesn't make them outdated
  "ui.components.rooms.keywords",
];

async function exportTranslations(lokaliseApi, projectId) {
  const exportProcess = await lokaliseApi.files().async_download(projectId, {
    format: "json",
    original_filenames: false,
    replace_breaks: false,
    json_unescaped_slashes: true,
    export_empty_as: "skip",
    filter_data: ["verified"],
  });

  const finishedProcess = await pollProcess(
    lokaliseApi,
    projectId,
    exportProcess.process_id
  );

  const bundleUrl = finishedProcess.details.download_url;

  console.log(`Downloading translations from: ${bundleUrl}`);

  const response = await fetch(bundleUrl);

  if (response.status !== 200 && response.status !== 0) {
    throw new Error(response.statusText);
  }

  console.log(`Extracting translations...`);

  const contents = await JSZip.loadAsync(await response.arrayBuffer());

  const files = {};
  await Promise.all(
    Object.keys(contents.files).map(async (filename) => {
      const file = contents.file(filename);
      if (!file) {
        // no file, probably a directory
        return;
      }
      files[filename.split("/").splice(-1)[0]] = await file.async("string");
    })
  );
  return files;
}

async function fetchDrafts(lokaliseApi, projectId) {
  const english = JSON.parse(
    await fs.readFile("src/translations/en.json", { encoding })
  );
  const keyNames = DRAFTS_ACCEPTED_KEYS.flatMap((key) => {
    const keys = key.split(".");
    const drafts = keys.reduce((obj, part) => obj?.[part], english) ?? {};
    return Object.keys(drafts).map((name) => [...keys, name].join("::"));
  });
  if (!keyNames.length) {
    return [];
  }
  const { items } = await lokaliseApi.keys().list({
    project_id: projectId,
    filter_keys: keyNames.join(","),
    include_translations: 1,
    limit: keyNames.length,
  });
  return items.flatMap((key) =>
    key.translations
      .filter(({ translation }) => translation)
      .map(({ language_iso, translation }) => ({
        filename: `${language_iso}.json`,
        path: key.key_name.web.split("::"),
        translation,
      }))
  );
}

function acceptDrafts(files, drafts) {
  const data = {};
  drafts.forEach(({ filename, path: keyPath, translation }) => {
    data[filename] ??= files[filename] ? JSON.parse(files[filename]) : {};
    const parent = keyPath.slice(0, -1).reduce((obj, part) => {
      obj[part] ??= {};
      return obj[part];
    }, data[filename]);
    parent[keyPath.at(-1)] = translation;
  });
  Object.entries(data).forEach(([filename, content]) => {
    files[filename] = JSON.stringify(content, null, 2);
  });
}

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

  // The backend project only provides the translations the mocked backend
  // needs (see convertBackendTranslations), which are merged into the demo,
  // gallery, cast and e2e builds. The shipped app fetches
  // them live from core, so builds that only produce the app (release, release
  // landing-page) can skip this second, whole-project export to save time.
  const projects = Object.entries(lokaliseProjects).filter(
    ([project]) =>
      !(project === "backend" && process.env.SKIP_BACKEND_TRANSLATIONS)
  );
  if (projects.length !== Object.keys(lokaliseProjects).length) {
    console.log(
      "Skipping backend translations download (SKIP_BACKEND_TRANSLATIONS)"
    );
  }

  await Promise.all(
    projects.map(async ([project, projectId]) => {
      try {
        const [files, drafts] = await Promise.all([
          exportTranslations(lokaliseApi, projectId),
          project === "frontend"
            ? fetchDrafts(lokaliseApi, projectId)
            : undefined,
        ]);
        if (drafts) {
          acceptDrafts(files, drafts);
        }

        await mkdirPromise;
        await Promise.all(
          Object.entries(files).map(([filename, content]) =>
            fs.writeFile(path.join(inDir, project, filename), content, {
              flag: "w",
              encoding,
            })
          )
        );
      } catch (err) {
        console.error(err);
        throw err;
      }
    })
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
