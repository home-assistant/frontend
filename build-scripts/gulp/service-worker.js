// Generate service worker.
// Based on manifest, create a file with the content as service_worker.js
/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
const gulp = require("gulp");
const path = require("path");
const fs = require("fs-extra");
const config = require("../paths.js");

const swPath = path.resolve(config.root, "service_worker.js");

const writeSW = (content) => fs.outputFileSync(swPath, content.trim() + "\n");

gulp.task("gen-service-worker-dev", (done) => {
  writeSW(
    `
console.debug('Service worker disabled in development');

self.addEventListener('install', (event) => {
  self.skipWaiting();
});
  `
  );
  done();
});

gulp.task("gen-service-worker-prod", (done) => {
  fs.copySync(
    path.resolve(config.output, "service_worker.js"),
    path.resolve(config.root, "service_worker.js")
  );
  done();
});
