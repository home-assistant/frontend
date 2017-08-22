/**
 * Polymer build strategy to strip imports, even if explictely imported
 */
module.exports.stripImportsStrategy = function (urls) {
  return (bundles) => {
    for (const bundle of bundles) {
      for (const url of urls) {
        bundle.stripImports.add(url);
      }
    }
    return bundles;
  };
};

/**
 * Polymer build strategy to strip everything but the entrypoints
 * for bundles that match a specific entry point.
 */
module.exports.stripAllButEntrypointStrategy = function (entryPoint) {
  return (bundles) => {
    for (const bundle of bundles) {
      if (bundle.entrypoints.size === 1 &&
          bundle.entrypoints.has(entryPoint)) {
        for (const file of bundle.files) {
          if (!bundle.entrypoints.has(file)) {
            bundle.stripImports.add(file);
          }
        }
      }
    }
    return bundles;
  };
};
