// Generate service workers

import { deleteAsync } from "del";
import { mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { injectManifest } from "workbox-build";
import paths from "../paths.ts";

const SW_MAP = {
  [paths.app_output_latest]: "modern",
  [paths.app_output_es5]: "legacy",
};

const SW_DEV =
  `
console.debug('Service worker disabled in development');

self.addEventListener('install', (event) => {
  // This will activate the dev service worker,
  // removing any prod service worker the dev might have running
  self.skipWaiting();
});
  `.trim() + "\n";

export const genServiceWorkerAppDev = async () => {
  await mkdir(paths.app_output_root, { recursive: true });
  await Promise.all(
    Object.values(SW_MAP).map((build) =>
      writeFile(join(paths.app_output_root, `sw-${build}.js`), SW_DEV, {
        encoding: "utf-8",
      })
    )
  );
};

export const genServiceWorkerAppProd = () =>
  Promise.all(
    Object.entries(SW_MAP).map(async ([outPath, build]) => {
      const manifest = JSON.parse(
        await readFile(join(outPath, "manifest.json"), "utf-8")
      );
      const swSrc = join(paths.app_output_root, manifest["service-worker.js"]);
      const swDest = join(paths.app_output_root, `sw-${build}.js`);
      const buildDir = relative(paths.app_output_root, outPath);
      const { warnings } = await injectManifest({
        swSrc,
        swDest,
        injectionPoint: "__WB_MANIFEST__",
        // Files that mach this pattern will be considered unique and skip revision check
        // ignore JS files + translation files
        dontCacheBustURLsMatching: new RegExp(
          `(?:${buildDir}/.+|static/translations/.+)`
        ),
        globDirectory: paths.app_output_root,
        globPatterns: [
          `${buildDir}/*.js`,
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
        globIgnores: [`${buildDir}/service-worker*`],
      });
      if (warnings.length > 0) {
        console.warn(
          `Problems while injecting ${build} service worker:\n`,
          warnings.join("\n")
        );
      }
      await deleteAsync(`${swSrc}?(.map)`);
      // Needed to install new SW from a cached HTML
      if (build === "modern") {
        const swOld = join(paths.app_output_root, "service_worker.js");
        await symlink(basename(swDest), swOld);
      }
    })
  );
