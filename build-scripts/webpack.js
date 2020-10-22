const webpack = require("webpack");
const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const ManifestPlugin = require("webpack-manifest-plugin");
const paths = require("./paths.js");
const bundle = require("./bundle");

const createWebpackConfig = ({
  entry,
  outputPath,
  publicPath,
  defineOverlay,
  isProdBuild,
  latestBuild,
  isStatsBuild,
  dontHash,
}) => {
  if (!dontHash) {
    dontHash = new Set();
  }
  const ignorePackages = bundle.ignorePackages({ latestBuild });
  return {
    mode: isProdBuild ? "production" : "development",
    devtool: isProdBuild
      ? "cheap-module-source-map"
      : "eval-cheap-module-source-map",
    entry,
    node: false,
    module: {
      rules: [
        {
          test: /\.m?js$|\.ts$/,
          exclude: bundle.babelExclude(),
          use: {
            loader: "babel-loader",
            options: bundle.babelOptions({ latestBuild }),
          },
        },
        {
          test: /\.css$/,
          use: "raw-loader",
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
    },
    plugins: [
      new ManifestPlugin({
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
        new RegExp(bundle.emptyPackages({ latestBuild }).join("|")),
        path.resolve(paths.polymer_dir, "src/util/empty.js")
      ),
      // We need to change the import of the polyfill for EventTarget, so we replace the polyfill file with our customized one
      new webpack.NormalModuleReplacementPlugin(
        new RegExp(
          require.resolve(
            "lit-virtualizer/lib/uni-virtualizer/lib/polyfillLoaders/EventTarget.js"
          )
        ),
        path.resolve(paths.polymer_dir, "src/resources/EventTarget-ponyfill.js")
      ),
    ],
    resolve: {
      extensions: [".ts", ".js", ".json"],
    },
    output: {
      filename: ({ chunk }) => {
        if (!isProdBuild || dontHash.has(chunk.name)) {
          return `${chunk.name}.js`;
        }
        return `${chunk.name}.${chunk.hash.substr(0, 8)}.js`;
      },
      environment: {
        // The environment supports arrow functions ('() => { ... }').
        arrowFunction: latestBuild,
        // The environment supports BigInt as literal (123n).
        bigIntLiteral: false,
        // The environment supports const and let for variable declarations.
        const: latestBuild,
        // The environment supports destructuring ('{ a, b } = obj').
        destructuring: latestBuild,
        // The environment supports an async import() function to import EcmaScript modules.
        dynamicImport: latestBuild,
        // The environment supports 'for of' iteration ('for (const x of array) { ... }').
        forOf: latestBuild,
        // The environment supports ECMAScript Module syntax to import ECMAScript modules (import ... from '...').
        module: latestBuild,
      },
      chunkFilename:
        isProdBuild && !isStatsBuild
          ? "chunk.[chunkhash].js"
          : "[name].chunk.js",
      path: outputPath,
      publicPath,
      // To silence warning in worker plugin
      globalObject: "self",
    },
  };
};

const createAppConfig = ({ isProdBuild, latestBuild, isStatsBuild }) => {
  return createWebpackConfig(
    bundle.config.app({ isProdBuild, latestBuild, isStatsBuild })
  );
};

const createDemoConfig = ({ isProdBuild, latestBuild, isStatsBuild }) => {
  return createWebpackConfig(
    bundle.config.demo({ isProdBuild, latestBuild, isStatsBuild })
  );
};

const createCastConfig = ({ isProdBuild, latestBuild }) => {
  return createWebpackConfig(bundle.config.cast({ isProdBuild, latestBuild }));
};

const createHassioConfig = ({ isProdBuild, latestBuild }) => {
  return createWebpackConfig(
    bundle.config.hassio({ isProdBuild, latestBuild })
  );
};

const createGalleryConfig = ({ isProdBuild, latestBuild }) => {
  return createWebpackConfig(
    bundle.config.gallery({ isProdBuild, latestBuild })
  );
};

module.exports = {
  createAppConfig,
  createDemoConfig,
  createCastConfig,
  createHassioConfig,
  createGalleryConfig,
};
