#!/usr/bin/env node
// Script to print Babel plugins and Core JS polyfills that will be used by browserslist environments

import { transformSync } from "@babel/core";
import compilationTargets, {
  getInclusionReasons,
} from "@babel/helper-compilation-targets";
import coreJSCompat from "core-js-compat";
import { babelOptions } from "./bundle.cjs";

const detailsOpen = (heading) =>
  `<details>\n<summary><h4>${heading}</h4></summary>\n`;
const detailsClose = "</details>\n";

// Copied from @babel/preset-env's internal `logPlugin`, which Babel 8 no
// longer exposes (the package rolls up into lib/index.js and exports nothing
// but the preset). Prints an item with the targets that require it.
const logPlugin = (item, targetVersions, list) => {
  const filteredList = getInclusionReasons(item, targetVersions, list);
  const support = list[item];
  if (!support) {
    console.log(`  ${item}`);
    return;
  }
  let formattedTargets = `{`;
  let first = true;
  for (const target of Object.keys(filteredList)) {
    if (!first) formattedTargets += `,`;
    first = false;
    formattedTargets += ` ${target}`;
    if (support[target]) formattedTargets += ` < ${support[target]}`;
  }
  formattedTargets += ` }`;
  console.log(`  ${item} ${formattedTargets}`);
};

// Copied from babel-plugin-polyfill-corejs3's generated
// corejs3ShippedProposalsList, which v1 no longer exposes (it is inlined in
// the package's rolled-up bundle).
const shippedProposalsList = new Set([
  "esnext.array.group",
  "esnext.array.group-to-map",
  "esnext.iterator.zip",
  "esnext.iterator.zip-keyed",
  "esnext.symbol.metadata",
]);

// Generate filter function based on proposal/method inputs
// Copied and adapted from babel-plugin-polyfill-corejs3/esm/index.mjs
const polyfillFilter = (method, proposals, shippedProposals) => (name) => {
  if (proposals || method === "entry-global") return true;
  if (shippedProposals && shippedProposalsList.has(name)) {
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
  const presetEnvOpts = babelOpts.presets.find(
    (preset) => Array.isArray(preset) && preset[0] === "@babel/preset-env"
  )?.[1];
  // Core-JS polyfills are injected by babel-plugin-polyfill-corejs3 (Babel 8
  // removed preset-env's `useBuiltIns`), so read its options here.
  const corejsOpts = babelOpts.plugins.find(
    (plugin) =>
      Array.isArray(plugin) && plugin[0] === "babel-plugin-polyfill-corejs3"
  )?.[1];

  // Transforming an empty file with preset-env in debug mode logs the included
  // plugins. The caller declares the same capabilities babel-loader does, so
  // plugins gated on bundler support (e.g. transform-export-namespace-from)
  // match the build.
  presetEnvOpts.debug = true;
  console.log(detailsOpen(`${buildType} Build Babel Plugins`));
  transformSync("", {
    ...babelOpts,
    configFile: false,
    filename: "audit.js",
    caller: {
      name: "list-plugins-and-polyfills",
      supportsStaticESM: true,
      supportsDynamicImport: true,
      supportsTopLevelAwait: true,
      supportsExportNamespaceFrom: true,
    },
  });
  console.log(detailsClose);

  // Manually log the Core-JS polyfills using the same technique
  if (corejsOpts) {
    console.log(detailsOpen(`${buildType} Build Core-JS Polyfills`));
    const targets = compilationTargets(babelOpts.targets, {
      browserslistEnv,
    });
    // `version` limits the list to modules the installed core-js ships,
    // mirroring the provider's own filtering.
    const polyfillList = coreJSCompat({
      targets,
      version: corejsOpts.version,
    }).list.filter(
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
