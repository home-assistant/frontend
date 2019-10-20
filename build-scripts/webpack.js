const webpack = require("webpack");
const fs = require("fs");
const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const WorkboxPlugin = require("workbox-webpack-plugin");
const ManifestPlugin = require("webpack-manifest-plugin");
const paths = require("./paths.js");
const { babelLoaderConfig } = require("./babel.js");

let version = fs
  .readFileSync(path.resolve(paths.polymer_dir, "setup.py"), "utf8")
  .match(/\d{8}\.\d+/);
if (!version) {
  throw Error("Version not found");
}
version = version[0];

const genMode = (isProdBuild) => (isProdBuild ? "production" : "development");
const genDevTool = (isProdBuild) =>
  isProdBuild ? "source-map" : "inline-cheap-module-source-map";
const genFilename = (isProdBuild, dontHash = new Set()) => ({ chunk }) => {
  if (!isProdBuild || dontHash.has(chunk.name)) {
    return `${chunk.name}.js`;
  }
  return `${chunk.name}.${chunk.hash.substr(0, 8)}.js`;
};
const genChunkFilename = (isProdBuild, isStatsBuild) =>
  isProdBuild && !isStatsBuild ? "chunk.[chunkhash].js" : "[name].chunk.js";

const resolve = {
  extensions: [".ts", ".js", ".json", ".tsx"],
  alias: {
    react: "preact-compat",
    "react-dom": "preact-compat",
    // Not necessary unless you consume a module using `createClass`
    "create-react-class": "preact-compat/lib/create-react-class",
    // Not necessary unless you consume a module requiring `react-dom-factories`
    "react-dom-factories": "preact-compat/lib/react-dom-factories",
  },
};

const cssLoader = {
  test: /\.css$/,
  use: "raw-loader",
};
const htmlLoader = {
  test: /\.(html)$/,
  use: {
    loader: "html-loader",
    options: {
      exportAsEs6Default: true,
    },
  },
};

const plugins = [
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
  // Ignore mwc icons pointing at CDN.
  new webpack.NormalModuleReplacementPlugin(
    /@material\/mwc-icon\/mwc-icon-font\.js$/,
    path.resolve(paths.polymer_dir, "src/util/empty.js")
  ),
];

const optimization = (latestBuild) => ({
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
});

const createAppConfig = ({ isProdBuild, latestBuild, isStatsBuild }) => {
  const isCI = process.env.CI === "true";

  // Create an object mapping browser urls to their paths during build
  const translationMetadata = require("../build-translations/translationMetadata.json");
  const workBoxTranslationsTemplatedURLs = {};
  const englishFP = translationMetadata.translations.en.fingerprints;
  Object.keys(englishFP).forEach((key) => {
    workBoxTranslationsTemplatedURLs[
      `/static/translations/${englishFP[key]}`
    ] = `build-translations/output/${key}.json`;
  });

  const entry = {
    app: "./src/entrypoints/app.ts",
    authorize: "./src/entrypoints/authorize.ts",
    onboarding: "./src/entrypoints/onboarding.ts",
    core: "./src/entrypoints/core.ts",
    compatibility: "./src/entrypoints/compatibility.ts",
    "custom-panel": "./src/entrypoints/custom-panel.ts",
    "hass-icons": "./src/entrypoints/hass-icons.ts",
  };

  return {
    mode: genMode(isProdBuild),
    devtool: genDevTool(isProdBuild),
    entry,
    module: {
      rules: [babelLoaderConfig({ latestBuild }), cssLoader, htmlLoader],
    },
    optimization: optimization(latestBuild),
    plugins: [
      new ManifestPlugin(),
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(!isProdBuild),
        __DEMO__: false,
        __BUILD__: JSON.stringify(latestBuild ? "latest" : "es5"),
        __VERSION__: JSON.stringify(version),
        __STATIC_PATH__: "/static/",
        "process.env.NODE_ENV": JSON.stringify(
          isProdBuild ? "production" : "development"
        ),
      }),
      ...plugins,
      latestBuild &&
        new WorkboxPlugin.InjectManifest({
          swSrc: "./src/entrypoints/service-worker-hass.js",
          swDest: "service_worker.js",
          importWorkboxFrom: "local",
          include: [/\.js$/],
          templatedURLs: {
            ...workBoxTranslationsTemplatedURLs,
            "/static/icons/favicon-192x192.png":
              "public/icons/favicon-192x192.png",
            "/static/fonts/roboto/Roboto-Light.woff2":
              "node_modules/roboto-fontface/fonts/roboto/Roboto-Light.woff2",
            "/static/fonts/roboto/Roboto-Medium.woff2":
              "node_modules/roboto-fontface/fonts/roboto/Roboto-Medium.woff2",
            "/static/fonts/roboto/Roboto-Regular.woff2":
              "node_modules/roboto-fontface/fonts/roboto/Roboto-Regular.woff2",
            "/static/fonts/roboto/Roboto-Bold.woff2":
              "node_modules/roboto-fontface/fonts/roboto/Roboto-Bold.woff2",
          },
        }),
    ].filter(Boolean),
    output: {
      filename: genFilename(isProdBuild),
      chunkFilename: genChunkFilename(isProdBuild, isStatsBuild),
      path: latestBuild ? paths.output : paths.output_es5,
      publicPath: latestBuild ? "/frontend_latest/" : "/frontend_es5/",
      // For workerize loader
      globalObject: "self",
    },
    resolve,
  };
};

const createDemoConfig = ({ isProdBuild, latestBuild, isStatsBuild }) => {
  return {
    mode: genMode(isProdBuild),
    devtool: genDevTool(isProdBuild),
    entry: {
      main: "./demo/src/entrypoint.ts",
      compatibility: "./src/entrypoints/compatibility.ts",
    },
    module: {
      rules: [babelLoaderConfig({ latestBuild }), cssLoader, htmlLoader],
    },
    optimization: optimization(latestBuild),
    plugins: [
      new ManifestPlugin(),
      new webpack.DefinePlugin({
        __DEV__: !isProdBuild,
        __BUILD__: JSON.stringify(latestBuild ? "latest" : "es5"),
        __VERSION__: JSON.stringify(`DEMO-${version}`),
        __DEMO__: true,
        __STATIC_PATH__: "/static/",
        "process.env.NODE_ENV": JSON.stringify(
          isProdBuild ? "production" : "development"
        ),
      }),
      ...plugins,
    ].filter(Boolean),
    resolve,
    output: {
      filename: genFilename(isProdBuild),
      chunkFilename: genChunkFilename(isProdBuild, isStatsBuild),
      path: path.resolve(
        paths.demo_root,
        latestBuild ? "frontend_latest" : "frontend_es5"
      ),
      publicPath: latestBuild ? "/frontend_latest/" : "/frontend_es5/",
      // For workerize loader
      globalObject: "self",
    },
  };
};

const createCastConfig = ({ isProdBuild, latestBuild }) => {
  const isStatsBuild = false;
  const entry = {
    launcher: "./cast/src/launcher/entrypoint.ts",
  };

  if (latestBuild) {
    entry.receiver = "./cast/src/receiver/entrypoint.ts";
  }

  return {
    mode: genMode(isProdBuild),
    devtool: genDevTool(isProdBuild),
    entry,
    module: {
      rules: [babelLoaderConfig({ latestBuild }), cssLoader, htmlLoader],
    },
    optimization: optimization(latestBuild),
    plugins: [
      new ManifestPlugin(),
      new webpack.DefinePlugin({
        __DEV__: !isProdBuild,
        __BUILD__: JSON.stringify(latestBuild ? "latest" : "es5"),
        __VERSION__: JSON.stringify(version),
        __DEMO__: false,
        __STATIC_PATH__: "/static/",
        "process.env.NODE_ENV": JSON.stringify(
          isProdBuild ? "production" : "development"
        ),
      }),
      ...plugins,
    ].filter(Boolean),
    resolve,
    output: {
      filename: genFilename(isProdBuild),
      chunkFilename: genChunkFilename(isProdBuild, isStatsBuild),
      path: path.resolve(
        paths.cast_root,
        latestBuild ? "frontend_latest" : "frontend_es5"
      ),
      publicPath: latestBuild ? "/frontend_latest/" : "/frontend_es5/",
      // For workerize loader
      globalObject: "self",
    },
  };
};

module.exports = {
  resolve,
  plugins,
  optimization,
  createAppConfig,
  createDemoConfig,
  createCastConfig,
};
