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

// minify-literals is ESM-only, so load it via dynamic import from this CJS loader.
// Also map to cache loader promises per environment (e.g., 'modern', 'legacy')
const loaderInitPromises = new Map();
const initLoader = (browserslistEnv) => {
  if (!loaderInitPromises.has(browserslistEnv)) {
    loaderInitPromises.set(
      browserslistEnv,
      Promise.all([
        import("minify-literals"),
        import("browserslist"),
        import("lightningcss"),
      ]).then(([minifyModule, browserslistModule, lightningcssModule]) => {
        const browserslist = browserslistModule.default;
        const { browserslistToTargets } = lightningcssModule;
        const rawTargets = browserslist(null, { env: browserslistEnv });
        if (!rawTargets.length) {
          throw new Error(
            `No browsers resolved for browserslist environment "${browserslistEnv}"`
          );
        }
        const lightningcssTargets = browserslistToTargets(rawTargets);

        return {
          minifyHTMLLiterals: minifyModule.minifyHTMLLiterals,
          lightningcssTargets,
        };
      })
    );
  }
  return loaderInitPromises.get(browserslistEnv);
};

// HTML options mirror the previous babel-plugin-template-html-minifier config
// (html-minifier-next is option-compatible with html-minifier-terser). CSS in
// css`` templates and inline <style> is handled by minify-literals'
// lightningcss. We pass in the targets from browserslist so lightningcss
// can minify CSS appropriately for the build environment.
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
  const { browserslistEnv } = this.getOptions();

  initLoader(browserslistEnv)
    .then(({ minifyHTMLLiterals, lightningcssTargets }) =>
      minifyHTMLLiterals(source, {
        fileName: this.resourcePath,
        html: htmlOptions,
        css: {
          targets: lightningcssTargets,
        },
      })
    )
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
