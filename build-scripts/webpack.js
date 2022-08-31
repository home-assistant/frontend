/* eslint-disable @typescript-eslint/no-var-requires */
const webpack = require("webpack");
const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const { WebpackManifestPlugin } = require("webpack-manifest-plugin");
const log = require("fancy-log");
const WebpackBar = require("webpackbar");
const paths = require("./paths.js");
const bundle = require("./bundle.js");

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
  entry,
  outputPath,
  publicPath,
  defineOverlay,
  isProdBuild,
  latestBuild,
  isStatsBuild,
  isHassioBuild,
  dontHash,
}) => {
  if (!dontHash) {
    dontHash = new Set();
  }
  const ignorePackages = bundle.ignorePackages({ latestBuild });
  return {
    mode: isProdBuild ? "production" : "development",
    target: ["web", latestBuild ? "es2017" : "es5"],
    devtool: isProdBuild
      ? "cheap-module-source-map"
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
              ...bundle.babelOptions({ latestBuild }),
              cacheDirectory: !isProdBuild,
              cacheCompression: false,
            },
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
          terserOptions: bundle.terserOptions(latestBuild),
        }),
      ],
      moduleIds: isProdBuild && !isStatsBuild ? "deterministic" : "named",
      chunkIds: isProdBuild && !isStatsBuild ? "deterministic" : "named",
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
            // eslint-disable-next-line no-console
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
      !isProdBuild && new LogStartCompilePlugin(),
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
        "lit/polyfill-support$": "lit/polyfill-support.js",
        "@lit-labs/virtualizer/layouts/grid":
          "@lit-labs/virtualizer/layouts/grid.js",
      },
    },
    output: {
      filename: ({ chunk }) => {
        if (!isProdBuild || isStatsBuild || dontHash.has(chunk.name)) {
          return `${chunk.name}.js`;
        }
        return `${chunk.name}.${chunk.hash.substr(0, 8)}.js`;
      },
      chunkFilename:
        isProdBuild && !isStatsBuild ? "[chunkhash:8].js" : "[id].chunk.js",
      path: outputPath,
      publicPath,
      // To silence warning in worker plugin
      globalObject: "self",
    },
    experiments: {
      topLevelAwait: true,
    },
  };
};

const createAppConfig = ({ isProdBuild, latestBuild, isStatsBuild }) =>
  createWebpackConfig(
    bundle.config.app({ isProdBuild, latestBuild, isStatsBuild })
  );

const createDemoConfig = ({ isProdBuild, latestBuild, isStatsBuild }) =>
  createWebpackConfig(
    bundle.config.demo({ isProdBuild, latestBuild, isStatsBuild })
  );

const createCastConfig = ({ isProdBuild, latestBuild }) =>
  createWebpackConfig(bundle.config.cast({ isProdBuild, latestBuild }));

const createHassioConfig = ({ isProdBuild, latestBuild }) =>
  createWebpackConfig(bundle.config.hassio({ isProdBuild, latestBuild }));

const createGalleryConfig = ({ isProdBuild, latestBuild }) =>
  createWebpackConfig(bundle.config.gallery({ isProdBuild, latestBuild }));

module.exports = {
  createAppConfig,
  createDemoConfig,
  createCastConfig,
  createHassioConfig,
  createGalleryConfig,
};
