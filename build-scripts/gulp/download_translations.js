const gulp = require("gulp");
const fs = require("fs/promises");
const mapStream = require("map-stream");

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

// Backend translations do not currently pass HTML check so are excluded here for now
gulp.task("check-translations-html", function () {
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
