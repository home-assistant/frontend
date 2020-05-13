// Generate service worker.
// Based on manifest, create a file with the content as service_worker.js
/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
const gulp = require("gulp");
const path = require("path");
const fs = require("fs-extra");
const workboxBuild = require("workbox-build");
const sourceMapUrl = require("source-map-url");
const paths = require("../paths.js");

const swDest = path.resolve(paths.root, "service_worker.js");

const writeSW = (content) => fs.outputFileSync(swDest, content.trim() + "\n");

gulp.task("gen-service-worker-app-dev", (done) => {
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

gulp.task("gen-service-worker-app-prod", async () => {
  const workboxManifest = await workboxBuild.getManifest({
    // Files that mach this pattern will be considered unique and skip revision check
    // ignore JS files + translation files
    dontCacheBustURLsMatching: /(frontend_latest\/.+|static\/translations\/.+)/,

    globDirectory: paths.root,
    globPatterns: [
      "frontend_latest/*.js",
      // Cache all English translations because we catch them as fallback
      // Using pattern to match hash instead of * to avoid caching en-GB
      "static/translations/**/en-+([a-f0-9]).json",
      // Icon shown on splash screen
      "static/icons/favicon-192x192.png",
      "static/icons/favicon.ico",
      // Common fonts
      "static/fonts/roboto/Roboto-Light.woff2",
      "static/fonts/roboto/Roboto-Medium.woff2",
      "static/fonts/roboto/Roboto-Regular.woff2",
      "static/fonts/roboto/Roboto-Bold.woff2",
    ],
  });

  for (const warning of workboxManifest.warnings) {
    console.warn(warning);
  }

  // Replace `null` with 0 for better compression
  for (const entry of workboxManifest.manifestEntries) {
    if (entry.revision === null) {
      entry.revision = 0;
    }
  }

  const manifest = require(path.resolve(paths.output, "manifest.json"));

  // Write bundled source file
  let serviceWorkerContent = fs.readFileSync(
    paths.root + manifest["service_worker.js"],
    "utf-8"
  );
  // remove source map and add WB manifest
  serviceWorkerContent = sourceMapUrl.removeFrom(serviceWorkerContent);
  serviceWorkerContent = serviceWorkerContent.replace(
    "WB_MANIFEST",
    JSON.stringify(workboxManifest.manifestEntries)
  );

  // Write new file to root
  fs.writeFileSync(swDest, serviceWorkerContent);

  // Delete old file from frontend_latest
  fs.removeSync(paths.root + manifest["service_worker.js"]);
  fs.removeSync(paths.root + manifest["service_worker.js.map"]);
});
