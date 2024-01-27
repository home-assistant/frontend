const url = require("url");

const defaultOptions = {
  publicPath: "",
};

module.exports = function (userOptions = {}) {
  const options = { ...defaultOptions, ...userOptions };

  return {
    name: "manifest",
    generateBundle(outputOptions, bundle) {
      const manifest = {};

      for (const chunk of Object.values(bundle)) {
        if (!chunk.isEntry) {
          continue;
        }
        // Add js extension to mimic Webpack manifest.
        manifest[`${chunk.name}.js`] = url.resolve(
          options.publicPath,
          chunk.fileName
        );
      }

      this.emitFile({
        type: "asset",
        source: JSON.stringify(manifest, undefined, 2),
        name: "manifest.json",
        fileName: "manifest.json",
      });
    },
  };
};
