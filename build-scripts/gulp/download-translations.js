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
    Object.entries(lokaliseProjects).map(async ([project, projectId]) => {
      try {
        const exportProcess = await lokaliseApi
          .files()
          .async_download(projectId, {
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

        await mkdirPromise;
        await Promise.all(
          Object.keys(contents.files).map(async (filename) => {
            const file = contents.file(filename);
            if (!file) {
              // no file, probably a directory
              return;
            }
            const content = await file.async("nodebuffer");
            await fs.writeFile(
              path.join(inDir, project, filename.split("/").splice(-1)[0]),
              content,
              { flag: "w", encoding }
            );
          })
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
