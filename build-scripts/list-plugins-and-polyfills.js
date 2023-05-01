#!/usr/bin/env node
// Script to print Babel plugins and Core JS polyfills that will be used by browserslist environments

import { version as babelVersion } from "@babel/core";
import presetEnv from "@babel/preset-env";
import compilationTargets from "@babel/helper-compilation-targets";
import coreJSCompat from "core-js-compat";
import { logPlugin } from "@babel/preset-env/lib/debug.js";
import { babelOptions } from "./bundle.cjs";

const detailsOpen = (heading) =>
  `<details>\n<summary><h4>${heading}</h4></summary>\n`;
const detailsClose = "</details>\n";

const dummyAPI = {
  version: babelVersion,
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

for (const buildType of ["Modern", "Legacy"]) {
  const browserslistEnv = buildType.toLowerCase();
  const babelOpts = babelOptions({ latestBuild: browserslistEnv === "modern" });
  const presetEnvOpts = babelOpts.presets[0][1];

  // Invoking preset-env in debug mode will log the included plugins
  console.log(detailsOpen(`${buildType} Build Babel Plugins`));
  presetEnv.default(dummyAPI, {
    ...presetEnvOpts,
    browserslistEnv,
    debug: true,
  });
  console.log(detailsClose);

  // Manually log the Core-JS polyfills using the same technique
  if (presetEnvOpts.useBuiltIns) {
    console.log(detailsOpen(`${buildType} Build Core-JS Polyfills`));
    const targets = compilationTargets.default(babelOpts?.targets, {
      browserslistEnv,
    });
    const polyfillList = coreJSCompat({ targets }).list;
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
