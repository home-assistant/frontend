// The scoped custom element registry polyfill replaces window.customElements.
// The index page loads it as a classic script, before the app entries and the
// extra modules, so that no module defines an element in the native registry
// that the app no longer sees afterwards.

import { createHash } from "node:crypto";
import fs from "fs-extra";
import path from "node:path";
import paths from "../paths.cjs";

const PACKAGE_DIR = path.resolve(
  paths.root_dir,
  "node_modules/@webcomponents/scoped-custom-element-registry"
);
const SOURCE_FILE = "scoped-custom-element-registry.min.js";
const MAP_FILE = `${SOURCE_FILE}.map`;

const readPackageFile = (name) => fs.readFileSync(path.join(PACKAGE_DIR, name));

const contentHash = (content) =>
  createHash("sha256").update(content).digest("hex").slice(0, 16);

// The flag runs after the package code in the same script, so it stays unset
// if that code throws, and the index page then starts no module or script.
// The newline and the semicolon end a trailing comment or statement. Source map
// consumers read the last sourceMappingURL comment, so it goes after the flag.
export const withReadyFlag = (source, mapFile) =>
  `${source}\n;window.__haScopedRegistryReady = true;\n//# sourceMappingURL=${mapFile}\n`;

const scopedRegistryMapFile = (hashed) =>
  hashed
    ? `scoped-custom-element-registry.${contentHash(readPackageFile(MAP_FILE))}.js.map`
    : "scoped-custom-element-registry.js.map";

const polyfillSource = (hashed) =>
  withReadyFlag(
    readPackageFile(SOURCE_FILE).toString("utf-8"),
    scopedRegistryMapFile(hashed)
  );

// Matches the production file for the service worker precache.
export const SCOPED_REGISTRY_POLYFILL_GLOB =
  "scoped-custom-element-registry.*.js";

export const scopedRegistryPolyfillFile = (hashed) =>
  hashed
    ? `scoped-custom-element-registry.${contentHash(polyfillSource(true))}.js`
    : "scoped-custom-element-registry.js";

export const copyScopedRegistryPolyfill = (outputDir, hashed) => {
  fs.outputFileSync(
    path.join(outputDir, scopedRegistryPolyfillFile(hashed)),
    polyfillSource(hashed)
  );
  fs.outputFileSync(
    path.join(outputDir, scopedRegistryMapFile(hashed)),
    readPackageFile(MAP_FILE)
  );
};
