import fs from "fs/promises";
import gulp from "gulp";
import mapStream from "map-stream";
import transform from "gulp-json-transform";

const inDirFrontend = "translations/frontend";
const inDirBackend = "translations/backend";
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
  // We exclude backend translations because they are not compliant with the HTML rule for now
  return gulp.src([`${inDirFrontend}/*.json`]).pipe(checkHtml());
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

gulp.task(
  "check-downloaded-translations",
  gulp.series("check-translations-html", "check-all-files-exist")
);
