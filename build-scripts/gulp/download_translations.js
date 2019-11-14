const del = require("del");
const gulp = require("gulp");
const mapStream = require("map-stream");

const inDir = "translations";
const downloadDir = inDir + "/downloads";

const tasks = [];

function hasHtml(data) {
  return /<[a-z][\s\S]*>/i.test(data);
}

function recursiveCheckHasHtml(file, data, errors, recKey) {
  Object.keys(data).forEach(function(key) {
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

  return mapStream(function(file, cb) {
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

let taskName = "clean-downloaded-translations";
gulp.task(taskName, function() {
  return del([`${downloadDir}/**`]);
});
tasks.push(taskName);

taskName = "check-translations-html";
gulp.task(taskName, function() {
  return gulp.src(`${downloadDir}/*.json`).pipe(checkHtml());
});
tasks.push(taskName);

taskName = "move-downloaded-translations";
gulp.task(taskName, function() {
  return gulp.src(`${downloadDir}/*.json`).pipe(gulp.dest(inDir));
});
tasks.push(taskName);

taskName = "check-downloaded-translations";
gulp.task(
  taskName,
  gulp.series(
    "check-translations-html",
    "move-downloaded-translations",
    "clean-downloaded-translations"
  )
);
tasks.push(taskName);

module.exports = tasks;
