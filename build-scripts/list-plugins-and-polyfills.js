#!/usr/bin/env node
// Script to print Babel plugins and Core JS polyfills that will be used by browserslist environments

import { version as babelVersion } from "@babel/core";
import presetEnv from "@babel/preset-env";
import compilationTargets from "@babel/helper-compilation-targets";
import coreJSCompat from "core-js-compat";
import { logPlugin } from "@babel/preset-env/lib/debug.js";
import shippedPolyfills from "../node_modules/babel-plugin-polyfill-corejs3/lib/shipped-proposals.js";
import { babelOptions } from "./bundle.cjs";

const detailsOpen = (heading) =>
  `<details>\n<summary><h4>${heading}</h4></summary>\n`;
const detailsClose = "</details>\n";

const dummyAPI = {
  version: babelVersion,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  assertVersion: () => {},
  caller: (callback) =>
    callback({
      name: "Dummy Bundler",
      supportsStaticESM: true,
      supportsDynamicImport: true,
      supportsTopLevelAwait: true,
      supportsExportNamespaceFrom: true,
    }),
  targets: () => ({}),
};

// Generate filter function based on proposal/method inputs
// Copied and adapted from babel-plugin-polyfill-corejs3/esm/index.mjs
const polyfillFilter = (method, proposals, shippedProposals) => (name) => {
  if (proposals || method === "entry-global") return true;
  if (shippedProposals && shippedPolyfills.default.has(name)) {
    return true;
  }
  if (name.startsWith("esnext.")) {
    const esName = `es.${name.slice(7)}`;
    // If its imaginative esName is not in latest compat data, it means the proposal is not stage 4
    return esName in coreJSCompat.data;
  }
  return true;
};

// Log the plugins and polyfills for each build environment
for (const buildType of ["Modern", "Legacy"]) {
  const browserslistEnv = buildType.toLowerCase();
  const babelOpts = babelOptions({ latestBuild: browserslistEnv === "modern" });
  const presetEnvOpts = babelOpts.presets[0][1];
  // Core-JS polyfills are injected by babel-plugin-polyfill-corejs3 (Babel 8
  // removed preset-env's `useBuiltIns`), so read its options here.
  const corejsOpts = babelOpts.plugins.find(
    (plugin) =>
      Array.isArray(plugin) && plugin[0] === "babel-plugin-polyfill-corejs3"
  )?.[1];

  // Invoking preset-env in debug mode will log the included plugins
  console.log(detailsOpen(`${buildType} Build Babel Plugins`));
  presetEnv.default(dummyAPI, {
    ...presetEnvOpts,
    browserslistEnv,
    debug: true,
  });
  console.log(detailsClose);

  // Manually log the Core-JS polyfills using the same technique
  if (corejsOpts) {
    console.log(detailsOpen(`${buildType} Build Core-JS Polyfills`));
    const targets = compilationTargets.default(babelOpts?.targets, {
      browserslistEnv,
    });
    const polyfillList = coreJSCompat({ targets }).list.filter(
      polyfillFilter(
        corejsOpts.method,
        corejsOpts.proposals,
        corejsOpts.shippedProposals
      )
    );
    console.log(
      "The following %i polyfills may be injected by Babel:\n",
      polyfillList.length
    );
    for (const polyfill of polyfillList) {
      logPlugin(polyfill, targets, coreJSCompat.data);
    }
    console.log(detailsClose);
  }
}
