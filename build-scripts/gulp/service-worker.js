// Generate service worker.
// Based on manifest, create a file with the content as service_worker.js

import fs from "fs-extra";
import gulp from "gulp";
import path from "path";
import sourceMapUrl from "source-map-url";
import workboxBuild from "workbox-build";
import paths from "../paths.cjs";

const swDest = path.resolve(paths.app_output_root, "service_worker.js");

const writeSW = (content) => fs.outputFileSync(swDest, content.trim() + "\n");

gulp.task("gen-service-worker-app-dev", (done) => {
  writeSW(
    `
console.debug('Service worker disabled in development');

self.addEventListener('install', (event) => {
  // This will activate the dev service worker,
  // removing any prod service worker the dev might have running
  self.skipWaiting();
});
  `
  );
  done();
});

gulp.task("gen-service-worker-app-prod", async () => {
  // Read bundled source file
  const bundleManifestLatest = fs.readJsonSync(
    path.resolve(paths.app_output_latest, "manifest.json")
  );
  let serviceWorkerContent = fs.readFileSync(
    paths.app_output_root + bundleManifestLatest["service_worker.js"],
    "utf-8"
  );

  // Delete old file from frontend_latest so manifest won't pick it up
  fs.removeSync(
    paths.app_output_root + bundleManifestLatest["service_worker.js"]
  );
  fs.removeSync(
    paths.app_output_root + bundleManifestLatest["service_worker.js.map"]
  );

  // Remove ES5
  const bundleManifestES5 = fs.readJsonSync(
    path.resolve(paths.app_output_es5, "manifest.json")
  );
  fs.removeSync(paths.app_output_root + bundleManifestES5["service_worker.js"]);
  fs.removeSync(
    paths.app_output_root + bundleManifestES5["service_worker.js.map"]
  );

  const workboxManifest = await workboxBuild.getManifest({
    // Files that mach this pattern will be considered unique and skip revision check
    // ignore JS files + translation files
    dontCacheBustURLsMatching: /(frontend_latest\/.+|static\/translations\/.+)/,

    globDirectory: paths.app_output_root,
    globPatterns: [
      "frontend_latest/*.js",
      // Cache all English translations because we catch them as fallback
      // Using pattern to match hash instead of * to avoid caching en-GB
      // 'v' added as valid hash letter because in dev we hash with 'dev'
      "static/translations/**/en-+([a-fv0-9]).json",
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

  // remove source map and add WB manifest
  serviceWorkerContent = sourceMapUrl.removeFrom(serviceWorkerContent);
  serviceWorkerContent = serviceWorkerContent.replace(
    "WB_MANIFEST",
    JSON.stringify(workboxManifest.manifestEntries)
  );

  // Write new file to root
  fs.writeFileSync(swDest, serviceWorkerContent);
});
