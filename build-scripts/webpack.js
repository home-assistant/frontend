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

const createWebpackConfig = ({
  entry,
  outputRoot,
  defineOverlay,
  isProdBuild,
  latestBuild,
  isStatsBuild,
}) => {
  return {
    mode: isProdBuild ? "production" : "development",
    devtool: isProdBuild ? "source-map" : "inline-cheap-module-source-map",
    entry,
    module: {
      rules: [
        babelLoaderConfig({ latestBuild }),
        {
          test: /\.css$/,
          use: "raw-loader",
        },
        {
          test: /\.(html)$/,
          use: {
            loader: "html-loader",
            options: {
              exportAsEs6Default: true,
            },
          },
        },
      ],
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
        __VERSION__: JSON.stringify(version),
        __DEMO__: false,
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
      // Ignore mwc icons pointing at CDN.
      new webpack.NormalModuleReplacementPlugin(
        /@material\/mwc-icon\/mwc-icon-font\.js$/,
        path.resolve(paths.polymer_dir, "src/util/empty.js")
      ),
    ].filter(Boolean),
    resolve: {
      extensions: [".ts", ".js", ".json"],
      alias: {
        react: "preact-compat",
        "react-dom": "preact-compat",
        // Not necessary unless you consume a module using `createClass`
        "create-react-class": "preact-compat/lib/create-react-class",
        // Not necessary unless you consume a module requiring `react-dom-factories`
        "react-dom-factories": "preact-compat/lib/react-dom-factories",
      },
    },
    output: {
      filename: ({ chunk }) => {
        const dontHash = new Set();

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
  const config = createWebpackConfig({
    entry: {
      app: "./src/entrypoints/app.ts",
      authorize: "./src/entrypoints/authorize.ts",
      onboarding: "./src/entrypoints/onboarding.ts",
      core: "./src/entrypoints/core.ts",
      compatibility: "./src/entrypoints/compatibility.ts",
      "custom-panel": "./src/entrypoints/custom-panel.ts",
      "hass-icons": "./src/entrypoints/hass-icons.ts",
    },
    outputRoot: paths.root,
    isProdBuild,
    latestBuild,
    isStatsBuild,
  });

  if (latestBuild) {
    // Create an object mapping browser urls to their paths during build
    const translationMetadata = require("../build-translations/translationMetadata.json");
    const workBoxTranslationsTemplatedURLs = {};
    const englishFP = translationMetadata.translations.en.fingerprints;
    Object.keys(englishFP).forEach((key) => {
      workBoxTranslationsTemplatedURLs[
        `/static/translations/${englishFP[key]}`
      ] = `build-translations/output/${key}.json`;
    });

    config.plugins.push(
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
      })
    );
  }

  return config;
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
      __VERSION__: JSON.stringify(`DEMO-${version}`),
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
  });
};

const createHassioConfig = ({ isProdBuild, latestBuild }) => {
  if (latestBuild) {
    throw new Error("Hass.io does not support latest build!");
  }
  const config = createWebpackConfig({
    entry: {
      entrypoint: path.resolve(paths.hassio_dir, "src/entrypoint.js"),
    },
    outputRoot: "",
    isProdBuild,
    latestBuild,
  });

  config.output.path = paths.hassio_root;
  config.output.publicPath = paths.hassio_publicPath;

  return config;
};

const createGalleryConfig = ({ isProdBuild, latestBuild }) => {
  if (!latestBuild) {
    throw new Error("Gallery only supports latest build!");
  }
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
