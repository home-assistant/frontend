#!/usr/bin/env node
// Script to print Babel plugins that will be used by browserslist environments

import { version as babelVersion } from "@babel/core";
import presetEnv from "@babel/preset-env";
import { babelOptions } from "./bundle.cjs";

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

for (const browserslistEnv of ["modern", "legacy"]) {
  console.log("\nBrowsersList Environment = %s\n", browserslistEnv);
  presetEnv.default(dummyAPI, {
    ...babelOptions({ latestBuild: browserslistEnv === "modern" })
      .presets[0][1],
    browserslistEnv,
    debug: true,
  });
}
