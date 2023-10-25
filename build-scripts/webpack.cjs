const { existsSync } = require("fs");
const path = require("path");
const webpack = require("webpack");
const { StatsWriterPlugin } = require("webpack-stats-plugin");
const filterStats = require("@bundle-stats/plugin-webpack-filter").default;
const TerserPlugin = require("terser-webpack-plugin");
const { WebpackManifestPlugin } = require("webpack-manifest-plugin");
const log = require("fancy-log");
const WebpackBar = require("webpackbar");
const paths = require("./paths.cjs");
const bundle = require("./bundle.cjs");

class LogStartCompilePlugin {
  ignoredFirst = false;

  apply(compiler) {
    compiler.hooks.beforeCompile.tap("LogStartCompilePlugin", () => {
      if (!this.ignoredFirst) {
        this.ignoredFirst = true;
        return;
      }
      log("Changes detected. Starting compilation");
    });
  }
}

const createWebpackConfig = ({
  name,
  entry,
  outputPath,
  publicPath,
  defineOverlay,
  isProdBuild,
  latestBuild,
  isStatsBuild,
  isTestBuild,
  isHassioBuild,
  dontHash,
}) => {
  if (!dontHash) {
    dontHash = new Set();
  }
  const ignorePackages = bundle.ignorePackages({ latestBuild });
  return {
    name,
    mode: isProdBuild ? "production" : "development",
    target: `browserslist:${latestBuild ? "modern" : "legacy"}`,
    // For tests/CI, source maps are skipped to gain build speed
    // For production, generate source maps for accurate stack traces without source code
    // For development, generate "cheap" versions that can map to original line numbers
    devtool: isTestBuild
      ? false
      : isProdBuild
      ? "nosources-source-map"
      : "eval-cheap-module-source-map",
    entry,
    node: false,
    module: {
      rules: [
        {
          test: /\.m?js$|\.ts$/,
          use: {
            loader: "babel-loader",
            options: {
              ...bundle.babelOptions({ latestBuild, isProdBuild, isTestBuild }),
              cacheDirectory: !isProdBuild,
              cacheCompression: false,
            },
          },
          resolve: {
            fullySpecified: false,
          },
        },
        {
          test: /\.css$/,
          type: "asset/source",
        },
      ],
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          parallel: true,
          extractComments: true,
          terserOptions: bundle.terserOptions({ latestBuild, isTestBuild }),
        }),
      ],
      moduleIds: isProdBuild && !isStatsBuild ? "deterministic" : "named",
      chunkIds: isProdBuild && !isStatsBuild ? "deterministic" : "named",
      splitChunks: {
        // Disable splitting for web workers with ESM output
        // Imports of external chunks are broken
        chunks: latestBuild
          ? (chunk) => !chunk.canBeInitial() && !/^.+-worker$/.test(chunk.name)
          : undefined,
      },
    },
    plugins: [
      !isStatsBuild && new WebpackBar({ fancy: !isProdBuild }),
      new WebpackManifestPlugin({
        // Only include the JS of entrypoints
        filter: (file) => file.isInitial && !file.name.endsWith(".map"),
      }),
      new webpack.DefinePlugin(
        bundle.definedVars({ isProdBuild, latestBuild, defineOverlay })
      ),
      new webpack.IgnorePlugin({
        checkResource(resource, context) {
          // Only use ignore to intercept imports that we don't control
          // inside node_module dependencies.
          if (
            !context.includes("/node_modules/") ||
            // calling define.amd will call require("!!webpack amd options")
            resource.startsWith("!!webpack") ||
            // loaded by webpack dev server but doesn't exist.
            resource === "webpack/hot"
          ) {
            return false;
          }
          let fullPath;
          try {
            fullPath = resource.startsWith(".")
              ? path.resolve(context, resource)
              : require.resolve(resource);
          } catch (err) {
            console.error(
              "Error in Home Assistant ignore plugin",
              resource,
              context
            );
            throw err;
          }

          return ignorePackages.some((toIgnorePath) =>
            fullPath.startsWith(toIgnorePath)
          );
        },
      }),
      new webpack.NormalModuleReplacementPlugin(
        new RegExp(
          bundle.emptyPackages({ latestBuild, isHassioBuild }).join("|")
        ),
        path.resolve(paths.polymer_dir, "src/util/empty.js")
      ),
      // See `src/resources/intl-polyfill-legacy.ts` for explanation
      !latestBuild &&
        new webpack.NormalModuleReplacementPlugin(
          new RegExp(
            path.resolve(paths.polymer_dir, "src/resources/intl-polyfill.ts")
          ),
          path.resolve(
            paths.polymer_dir,
            "src/resources/intl-polyfill-legacy.ts"
          )
        ),
      !isProdBuild && new LogStartCompilePlugin(),
      isProdBuild &&
        new StatsWriterPlugin({
          filename: path.relative(
            outputPath,
            path.join(paths.build_dir, "stats", `${name}.json`)
          ),
          stats: { assets: true, chunks: true, modules: true },
          transform: (stats) => JSON.stringify(filterStats(stats)),
        }),
    ].filter(Boolean),
    resolve: {
      extensions: [".ts", ".js", ".json"],
      alias: {
        "lit/decorators$": "lit/decorators.js",
        "lit/directive$": "lit/directive.js",
        "lit/directives/until$": "lit/directives/until.js",
        "lit/directives/class-map$": "lit/directives/class-map.js",
        "lit/directives/style-map$": "lit/directives/style-map.js",
        "lit/directives/if-defined$": "lit/directives/if-defined.js",
        "lit/directives/guard$": "lit/directives/guard.js",
        "lit/directives/cache$": "lit/directives/cache.js",
        "lit/directives/repeat$": "lit/directives/repeat.js",
        "lit/directives/live$": "lit/directives/live.js",
        "lit/polyfill-support$": "lit/polyfill-support.js",
        "@lit-labs/virtualizer/layouts/grid":
          "@lit-labs/virtualizer/layouts/grid.js",
        "@lit-labs/virtualizer/polyfills/resize-observer-polyfill/ResizeObserver":
          "@lit-labs/virtualizer/polyfills/resize-observer-polyfill/ResizeObserver.js",
        "@lit-labs/observers/resize-controller":
          "@lit-labs/observers/resize-controller.js",
      },
    },
    output: {
      module: latestBuild,
      filename: ({ chunk }) =>
        !isProdBuild || isStatsBuild || dontHash.has(chunk.name)
          ? "[name].js"
          : "[name]-[contenthash].js",
      chunkFilename:
        isProdBuild && !isStatsBuild ? "[id]-[contenthash].js" : "[name].js",
      assetModuleFilename:
        isProdBuild && !isStatsBuild ? "[id]-[contenthash][ext]" : "[id][ext]",
      crossOriginLoading: "use-credentials",
      hashFunction: "xxhash64",
      hashDigest: "base64url",
      hashDigestLength: 11, // full length of 64 bit base64url
      path: outputPath,
      publicPath,
      // To silence warning in worker plugin
      globalObject: "self",
      // Since production source maps don't include sources, we need to point to them elsewhere
      // For dependencies, just provide the path (no source in browser)
      // Otherwise, point to the raw code on GitHub for browser to load
      ...Object.fromEntries(
        ["", "Fallback"].map((v) => [
          `devtool${v}ModuleFilenameTemplate`,
          !isTestBuild && isProdBuild
            ? (info) => {
                if (
                  !path.isAbsolute(info.absoluteResourcePath) ||
                  !existsSync(info.resourcePath) ||
                  info.resourcePath.startsWith("./node_modules")
                ) {
                  // Source URLs are unknown for dependencies, so we use a relative URL with a
                  // non - existent top directory.  This results in a clean source tree in browser
                  // dev tools, and they stay happy getting 404s with valid requests.
                  return `/unknown${path.resolve("/", info.resourcePath)}`;
                }
                return new URL(info.resourcePath, bundle.sourceMapURL()).href;
              }
            : undefined,
        ])
      ),
    },
    experiments: {
      outputModule: true,
    },
  };
};

const createAppConfig = ({
  isProdBuild,
  latestBuild,
  isStatsBuild,
  isTestBuild,
}) =>
  createWebpackConfig(
    bundle.config.app({ isProdBuild, latestBuild, isStatsBuild, isTestBuild })
  );

const createDemoConfig = ({ isProdBuild, latestBuild, isStatsBuild }) =>
  createWebpackConfig(
    bundle.config.demo({ isProdBuild, latestBuild, isStatsBuild })
  );

const createCastConfig = ({ isProdBuild, latestBuild }) =>
  createWebpackConfig(bundle.config.cast({ isProdBuild, latestBuild }));

const createHassioConfig = ({
  isProdBuild,
  latestBuild,
  isStatsBuild,
  isTestBuild,
}) =>
  createWebpackConfig(
    bundle.config.hassio({
      isProdBuild,
      latestBuild,
      isStatsBuild,
      isTestBuild,
    })
  );

const createGalleryConfig = ({ isProdBuild, latestBuild }) =>
  createWebpackConfig(bundle.config.gallery({ isProdBuild, latestBuild }));

module.exports = {
  createAppConfig,
  createDemoConfig,
  createCastConfig,
  createHassioConfig,
  createGalleryConfig,
  createWebpackConfig,
};
