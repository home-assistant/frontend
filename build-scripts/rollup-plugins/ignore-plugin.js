const path = require("path");

module.exports = function (userOptions = {}) {
  // Files need to be absolute paths.
  // This only works if the file has no exports
  // and only is imported for its side effects
  const files = userOptions.files || [];

  if (files.length === 0) {
    return {
      name: "ignore",
    };
  }

  return {
    name: "ignore",
    resolveId(importee, importer) {
      // Only use ignore to intercept imports that we don't control
      // inside node_module dependencies.
      if (
        importee.endsWith("commonjsHelpers.js") ||
        importee.endsWith("rollupPluginBabelHelpers.js") ||
        importee.endsWith("?commonjs-proxy") ||
        !importer ||
        !importer.includes("/node_modules/")
      ) {
        return null;
      }
      let fullPath;
      try {
        fullPath = importee.startsWith(".")
          ? path.resolve(importee, importer)
          : require.resolve(importee);
      } catch (err) {
        console.error("Error in ignore plugin", { importee, importer }, err);
        throw err;
      }

      return files.some((toIgnorePath) => fullPath.startsWith(toIgnorePath))
        ? fullPath
        : null;
    },

    load(id) {
      return files.some((toIgnorePath) => id.startsWith(toIgnorePath))
        ? {
            code: "",
          }
        : null;
    },
  };
};
