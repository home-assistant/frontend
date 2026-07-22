/* global module, require */
// rspack/webpack loader that minifies the HTML, SVG, and CSS inside lit
// tagged template literals using `minify-literals` (html-minifier-next +
// lightningcss). Replaces the unmaintained babel-plugin-template-html-minifier.
//
// It runs between swc and babel: swc has already stripped TS types and
// decorators (so minify-literals' acorn parser only sees plain ESM), but the
// `html`/`css`/`svg` tagged templates are still intact at ES2021. Running after
// babel instead would miss the legacy build, where babel lowers the templates
// to `_taggedTemplateLiteral()` calls that no longer look like tagged templates.

const remapping = require("@ampproject/remapping");

// Map to cache loader promises per environment (e.g., 'modern', 'legacy')
const loaderInitPromises = new Map();

const initLoader = (env) => {
  if (!loaderInitPromises.has(env)) {
    const promise = Promise.all([
      import("minify-literals"),
      import("browserslist"),
      import("lightningcss"),
    ]).then(([minifyModule, browserslistModule, lightningcssModule]) => {
      const browserslist = browserslistModule.default;
      const { browserslistToTargets } = lightningcssModule;

      // Request raw targets for the specific environment passed from rspack.cjs
      const rawTargets = browserslist(null, { env });
      const lightningcssTargets = browserslistToTargets(rawTargets);

      return {
        minifyHTMLLiterals: minifyModule.minifyHTMLLiterals,
        lightningcssTargets,
      };
    });

    loaderInitPromises.set(env, promise);
  }
  return loaderInitPromises.get(env);
};

// HTML options mirror the previous babel-plugin-template-html-minifier config
// (html-minifier-next is option-compatible with html-minifier-terser).
//
// `keepClosingSlash` is required for `svg`` templates: SVG elements such as
// `<path />` and `<circle />` are not void elements in HTML, so dropping the
// trailing slash would break the markup. It is harmless for HTML.
const htmlOptions = {
  caseSensitive: true,
  collapseWhitespace: true,
  conservativeCollapse: true,
  decodeEntities: true,
  keepClosingSlash: true,
  removeComments: true,
  removeRedundantAttributes: true,
};

module.exports = function minifyTemplateLiteralsLoader(source, map, meta) {
  const callback = this.async();

  // Read the environment from options (with fallback if unspecified)
  const options = this.getOptions() || {};
  const env = options.env;

  console.log("Minifying template literals for %s build", env);

  initLoader(env)
    .then(({ minifyHTMLLiterals, lightningcssTargets }) => {
      console.log("Targets:", JSON.stringify(lightningcssTargets));
      minifyHTMLLiterals(source, {
        fileName: this.resourcePath,
        html: htmlOptions,
        css: {
          targets: lightningcssTargets,
        },
      });
    })
    .then((result) => {
      if (!result) {
        // No tagged templates changed; pass through untouched (incl. incoming map).
        callback(null, source, map, meta);
        return;
      }
      // minify-literals builds its map from `source` alone, so `result.map`
      // describes minified output -> this loader's input (the swc output), not
      // the original file. Compose it over the incoming map (swc output ->
      // original source) so the map handed downstream still points at the
      // original source; otherwise every minified file's source map is wrong.
      const outMap =
        map && result.map
          ? remapping([result.map, map], () => null)
          : (result.map ?? map);
      callback(null, result.code, outMap, meta);
    })
    .catch(callback);
};
