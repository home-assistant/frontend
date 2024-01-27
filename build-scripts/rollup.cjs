const path = require("path");

const commonjs = require("@rollup/plugin-commonjs");
const resolve = require("@rollup/plugin-node-resolve");
const json = require("@rollup/plugin-json");
const { babel } = require("@rollup/plugin-babel");
const replace = require("@rollup/plugin-replace");
const visualizer = require("rollup-plugin-visualizer");
const { string } = require("rollup-plugin-string");
const { terser } = require("rollup-plugin-terser");
const manifest = require("./rollup-plugins/manifest-plugin.cjs");
const worker = require("./rollup-plugins/worker-plugin.cjs");
const dontHashPlugin = require("./rollup-plugins/dont-hash-plugin.cjs");
const ignore = require("./rollup-plugins/ignore-plugin.cjs");

const bundle = require("./bundle.cjs");
const paths = require("./paths.cjs");

const extensions = [".js", ".ts"];

/**
 * @param {Object} arg
 * @param { import("rollup").InputOption } arg.input
 */
const createRollupConfig = ({
  entry,
  outputPath,
  defineOverlay,
  isProdBuild,
  latestBuild,
  isStatsBuild,
  publicPath,
  dontHash,
  isWDS,
}) => ({
  /**
   * @type { import("rollup").InputOptions }
   */
  inputOptions: {
    input: entry,
    // Some entry points contain no JavaScript. This setting silences a warning about that.
    // https://rollupjs.org/configuration-options/#preserveentrysignatures
    preserveEntrySignatures: false,
    plugins: [
      ignore({
        files: bundle
          .emptyPackages({ latestBuild })
          // TEMP HACK: Makes Rollup build work again
          .concat(
            require.resolve(
              "@webcomponents/scoped-custom-element-registry/scoped-custom-element-registry.min"
            )
          ),
      }),
      resolve({
        extensions,
        preferBuiltins: false,
        browser: true,
        rootDir: paths.polymer_dir,
      }),
      commonjs(),
      json(),
      babel({
        ...bundle.babelOptions({ latestBuild, isProdBuild }),
        extensions,
        babelHelpers: isWDS ? "inline" : "bundled",
      }),
      string({
        // Import certain extensions as strings
        include: [path.join(paths.polymer_dir, "node_modules/**/*.css")],
      }),
      replace(bundle.definedVars({ isProdBuild, latestBuild, defineOverlay })),
      !isWDS &&
        manifest({
          publicPath,
        }),
      !isWDS && worker(),
      !isWDS && dontHashPlugin({ dontHash }),
      !isWDS && isProdBuild && terser(bundle.terserOptions({ latestBuild })),
      !isWDS &&
        isStatsBuild &&
        visualizer({
          // https://github.com/btd/rollup-plugin-visualizer#options
          open: true,
          sourcemap: true,
        }),
    ].filter(Boolean),
  },
  /**
   * @type { import("rollup").OutputOptions }
   */
  outputOptions: {
    // https://rollupjs.org/configuration-options/#output-dir
    dir: outputPath,
    // https://rollupjs.org/configuration-options/#output-format
    format: latestBuild ? "es" : "systemjs",
    // https://rollupjs.org/configuration-options/#output-externallivebindings
    externalLiveBindings: false,
    // https://rollupjs.org/configuration-options/#output-entryfilenames
    // https://rollupjs.org/configuration-options/#output-chunkfilenames
    // https://rollupjs.org/configuration-options/#output-assetfilenames
    entryFileNames:
      isProdBuild && !isStatsBuild ? "[name]-[hash].js" : "[name].js",
    chunkFileNames: isProdBuild && !isStatsBuild ? "c.[hash].js" : "[name].js",
    assetFileNames: isProdBuild && !isStatsBuild ? "a.[hash].js" : "[name].js",
    // https://rollupjs.org/configuration-options/#output-sourcemap
    sourcemap: isProdBuild ? true : "inline",
  },
});

const createAppConfig = ({ isProdBuild, latestBuild, isStatsBuild, isWDS }) =>
  createRollupConfig(
    bundle.config.app({
      isProdBuild,
      latestBuild,
      isStatsBuild,
      isWDS,
    })
  );

const createDemoConfig = ({ isProdBuild, latestBuild, isStatsBuild }) =>
  createRollupConfig(
    bundle.config.demo({
      isProdBuild,
      latestBuild,
      isStatsBuild,
    })
  );

const createCastConfig = ({ isProdBuild, latestBuild }) =>
  createRollupConfig(bundle.config.cast({ isProdBuild, latestBuild }));

const createHassioConfig = ({ isProdBuild, latestBuild }) =>
  createRollupConfig(bundle.config.hassio({ isProdBuild, latestBuild }));

const createGalleryConfig = ({ isProdBuild, latestBuild }) =>
  createRollupConfig(bundle.config.gallery({ isProdBuild, latestBuild }));

module.exports = {
  createAppConfig,
  createDemoConfig,
  createCastConfig,
  createHassioConfig,
  createGalleryConfig,
  createRollupConfig,
};
