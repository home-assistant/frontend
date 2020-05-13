const webpack = require("webpack");
const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const ManifestPlugin = require("webpack-manifest-plugin");
const paths = require("./paths.js");
const env = require("./env.js");
const { babelLoaderConfig } = require("./babel.js");

const createWebpackConfig = ({
  entry,
  outputRoot,
  defineOverlay,
  isProdBuild,
  latestBuild,
  isStatsBuild,
  dontHash,
}) => {
  if (!dontHash) {
    dontHash = new Set();
  }
  return {
    mode: isProdBuild ? "production" : "development",
    devtool: isProdBuild
      ? "cheap-module-source-map"
      : "eval-cheap-module-source-map",
    entry,
    module: {
      rules: [
        babelLoaderConfig({ latestBuild }),
        {
          test: /\.css$/,
          use: "raw-loader",
        },
      ],
    },
    externals: {
      esprima: "esprima",
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          cache: true,
          parallel: true,
          extractComments: true,
          sourceMap: true,
          terserOptions: {
            safari10: true,
            ecma: latestBuild ? undefined : 5,
          },
        }),
      ],
    },
    plugins: [
      new ManifestPlugin(),
      new webpack.DefinePlugin({
        __DEV__: !isProdBuild,
        __BUILD__: JSON.stringify(latestBuild ? "latest" : "es5"),
        __VERSION__: JSON.stringify(env.version()),
        __DEMO__: false,
        __BACKWARDS_COMPAT__: false,
        __STATIC_PATH__: "/static/",
        "process.env.NODE_ENV": JSON.stringify(
          isProdBuild ? "production" : "development"
        ),
        ...defineOverlay,
      }),
      // Ignore moment.js locales
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      // Color.js is bloated, it contains all color definitions for all material color sets.
      new webpack.NormalModuleReplacementPlugin(
        /@polymer\/paper-styles\/color\.js$/,
        path.resolve(paths.polymer_dir, "src/util/empty.js")
      ),
      // Ignore roboto pointing at CDN. We use local font-roboto-local.
      new webpack.NormalModuleReplacementPlugin(
        /@polymer\/font-roboto\/roboto\.js$/,
        path.resolve(paths.polymer_dir, "src/util/empty.js")
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@vaadin\/vaadin-material-styles\/font-roboto\.js$/,
        path.resolve(paths.polymer_dir, "src/util/empty.js")
      ),
      // Ignore mwc icons pointing at CDN.
      new webpack.NormalModuleReplacementPlugin(
        /@material\/mwc-icon\/mwc-icon-font\.js$/,
        path.resolve(paths.polymer_dir, "src/util/empty.js")
      ),
    ].filter(Boolean),
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
      chunkFilename:
        isProdBuild && !isStatsBuild
          ? "chunk.[chunkhash].js"
          : "[name].chunk.js",
      path: path.resolve(
        outputRoot,
        latestBuild ? "frontend_latest" : "frontend_es5"
      ),
      publicPath: latestBuild ? "/frontend_latest/" : "/frontend_es5/",
      // For workerize loader
      globalObject: "self",
    },
  };
};

const createAppConfig = ({ isProdBuild, latestBuild, isStatsBuild }) => {
  return createWebpackConfig({
    entry: {
      service_worker: "./src/entrypoints/service_worker.ts",
      app: "./src/entrypoints/app.ts",
      authorize: "./src/entrypoints/authorize.ts",
      onboarding: "./src/entrypoints/onboarding.ts",
      core: "./src/entrypoints/core.ts",
      compatibility: "./src/entrypoints/compatibility.ts",
      "custom-panel": "./src/entrypoints/custom-panel.ts",
    },
    outputRoot: paths.root,
    isProdBuild,
    latestBuild,
    isStatsBuild,
  });
};

const createDemoConfig = ({ isProdBuild, latestBuild, isStatsBuild }) => {
  return createWebpackConfig({
    entry: {
      main: path.resolve(paths.demo_dir, "src/entrypoint.ts"),
      compatibility: path.resolve(
        paths.polymer_dir,
        "src/entrypoints/compatibility.ts"
      ),
    },
    outputRoot: paths.demo_root,
    defineOverlay: {
      __VERSION__: JSON.stringify(`DEMO-${env.version()}`),
      __DEMO__: true,
    },
    isProdBuild,
    latestBuild,
    isStatsBuild,
  });
};

const createCastConfig = ({ isProdBuild, latestBuild }) => {
  const entry = {
    launcher: path.resolve(paths.cast_dir, "src/launcher/entrypoint.ts"),
  };

  if (latestBuild) {
    entry.receiver = path.resolve(paths.cast_dir, "src/receiver/entrypoint.ts");
  }

  return createWebpackConfig({
    entry,
    outputRoot: paths.cast_root,
    isProdBuild,
    latestBuild,
    defineOverlay: {
      __BACKWARDS_COMPAT__: true,
    },
  });
};

const createHassioConfig = ({ isProdBuild, latestBuild }) => {
  if (latestBuild) {
    throw new Error("Hass.io does not support latest build!");
  }
  const config = createWebpackConfig({
    entry: {
      entrypoint: path.resolve(paths.hassio_dir, "src/entrypoint.ts"),
    },
    outputRoot: "",
    isProdBuild,
    latestBuild,
    dontHash: new Set(["entrypoint"]),
  });

  config.output.path = paths.hassio_root;
  config.output.publicPath = paths.hassio_publicPath;

  return config;
};

const createGalleryConfig = ({ isProdBuild, latestBuild }) => {
  const config = createWebpackConfig({
    entry: {
      entrypoint: path.resolve(paths.gallery_dir, "src/entrypoint.js"),
    },
    outputRoot: paths.gallery_root,
    isProdBuild,
    latestBuild,
  });

  return config;
};

module.exports = {
  createAppConfig,
  createDemoConfig,
  createCastConfig,
  createHassioConfig,
  createGalleryConfig,
};
