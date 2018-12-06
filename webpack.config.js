const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const BabelMinifyPlugin = require("babel-minify-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const WorkboxPlugin = require("workbox-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const zopfli = require("@gfx/zopfli");
const translationMetadata = require("./build-translations/translationMetadata.json");
const { babelLoaderConfig } = require("./config/babel.js");

const version = fs.readFileSync("setup.py", "utf8").match(/\d{8}\.\d+/);
if (!version) {
  throw Error("Version not found");
}
const VERSION = version[0];
const isCI = process.env.CI === "true";
const isStatsBuild = process.env.STATS === "1";

const generateJSPage = (entrypoint, latestBuild) => {
  return new HtmlWebpackPlugin({
    inject: false,
    template: `./src/html/${entrypoint}.html.template`,
    // Default templateParameterGenerator code
    // https://github.com/jantimon/html-webpack-plugin/blob/master/index.js#L719
    templateParameters: (compilation, assets, option) => ({
      latestBuild,
      compatibility: assets.chunks.compatibility.entry,
      entrypoint: assets.chunks[entrypoint].entry,
      hassIconsJS: assets.chunks["hass-icons"].entry,
    }),
    filename: `${entrypoint}.html`,
  });
};

function createConfig(isProdBuild, latestBuild) {
  let buildPath = latestBuild ? "hass_frontend/" : "hass_frontend_es5/";
  const publicPath = latestBuild ? "/frontend_latest/" : "/frontend_es5/";

  const entry = {
    app: "./src/entrypoints/app.js",
    authorize: "./src/entrypoints/authorize.js",
    onboarding: "./src/entrypoints/onboarding.js",
    core: "./src/entrypoints/core.ts",
    compatibility: "./src/entrypoints/compatibility.js",
    "custom-panel": "./src/entrypoints/custom-panel.js",
    "hass-icons": "./src/entrypoints/hass-icons.js",
  };

  if (latestBuild) {
    entry["service-worker-hass"] = "./src/entrypoints/service-worker-hass.js";
  }

  return {
    mode: isProdBuild ? "production" : "development",
    devtool: isProdBuild
      ? "cheap-source-map "
      : "inline-cheap-module-source-map",
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
        // Took options from Polymer build tool
        // https://github.com/Polymer/tools/blob/master/packages/build/src/js-transform.ts
        new BabelMinifyPlugin(
          {
            // Disable the minify-constant-folding plugin because it has a bug relating to
            // invalid substitution of constant values into export specifiers:
            // https://github.com/babel/minify/issues/820
            evaluate: false,

            // TODO(aomarks) Find out why we disabled this plugin.
            simplifyComparisons: false,

            // Disable the simplify plugin because it can eat some statements preceeding
            // loops. https://github.com/babel/minify/issues/824
            simplify: false,

            // This is breaking ES6 output. https://github.com/Polymer/tools/issues/261
            mangle: false,
          },
          {}
        ),
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(!isProdBuild),
        __BUILD__: JSON.stringify(latestBuild ? "latest" : "es5"),
        __VERSION__: JSON.stringify(VERSION),
        __STATIC_PATH__: "/static/",
        "process.env.NODE_ENV": JSON.stringify(
          isProdBuild ? "production" : "development"
        ),
      }),
      new CopyWebpackPlugin(
        [
          latestBuild &&
            "node_modules/@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js",
          latestBuild && { from: "public", to: "." },
          latestBuild && {
            from: "build-translations/output",
            to: `translations`,
          },
          latestBuild && {
            from: "node_modules/@polymer/font-roboto-local/fonts",
            to: "fonts",
          },
          latestBuild &&
            "node_modules/@webcomponents/webcomponentsjs/webcomponents-bundle.js",
          latestBuild &&
            "node_modules/@webcomponents/webcomponentsjs/webcomponents-bundle.js.map",
          latestBuild && {
            from:
              "node_modules/react-big-calendar/lib/css/react-big-calendar.css",
            to: "panels/calendar/",
          },
          latestBuild && {
            from: "node_modules/leaflet/dist/leaflet.css",
            to: `images/leaflet/`,
          },
          latestBuild && {
            from: "node_modules/leaflet/dist/images",
            to: `images/leaflet/`,
          },
          !latestBuild && "public/__init__.py",
        ].filter(Boolean)
      ),
      // Ignore moment.js locales
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      // Color.js is bloated, it contains all color definitions for all material color sets.
      new webpack.NormalModuleReplacementPlugin(
        /@polymer\/paper-styles\/color\.js$/,
        path.resolve(__dirname, "src/util/empty.js")
      ),
      // Ignore roboto pointing at CDN. We use local font-roboto-local.
      new webpack.NormalModuleReplacementPlugin(
        /@polymer\/font-roboto\/roboto\.js$/,
        path.resolve(__dirname, "src/util/empty.js")
      ),
      isProdBuild &&
        !isCI &&
        !isStatsBuild &&
        new CompressionPlugin({
          cache: true,
          exclude: [/\.js\.map$/, /\.LICENSE$/, /\.py$/, /\.txt$/],
          algorithm(input, compressionOptions, callback) {
            return zopfli.gzip(input, compressionOptions, callback);
          },
        }),
      new WorkboxPlugin.InjectManifest({
        swSrc: "./src/entrypoints/service-worker-bootstrap.js",
        swDest: "service_worker.js",
        importWorkboxFrom: "local",
        include: [
          /core.ts$/,
          /app.js$/,
          /custom-panel.js$/,
          /hass-icons.js$/,
          /\.chunk\.js$/,
        ],
        templatedUrls: {
          [`/static/translations/${
            translationMetadata["translations"]["en"]["fingerprints"]["en"]
          }`]: "build-translations/output/en.json",
          "/static/icons/favicon-192x192.png":
            "public/icons/favicon-192x192.png",
          "/static/fonts/roboto/Roboto-Light.ttf":
            "node_modules/@polymer/font-roboto-local/fonts/roboto/Roboto-Light.ttf",
          "/static/fonts/roboto/Roboto-Medium.ttf":
            "node_modules/@polymer/font-roboto-local/fonts/roboto/Roboto-Medium.ttf",
          "/static/fonts/roboto/Roboto-Regular.ttf":
            "node_modules/@polymer/font-roboto-local/fonts/roboto/Roboto-Regular.ttf",
          "/static/fonts/roboto/Roboto-Bold.ttf":
            "node_modules/@polymer/font-roboto-local/fonts/roboto/Roboto-Bold.ttf",
        },
      }),
      new HtmlWebpackPlugin({
        inject: false,
        template: "./src/html/index.html.template",
        // Default templateParameterGenerator code
        // https://github.com/jantimon/html-webpack-plugin/blob/master/index.js#L719
        templateParameters: (compilation, assets, option) => ({
          latestBuild,
          compatibility: assets.chunks.compatibility.entry,
          appJS: assets.chunks.app.entry,
          coreJS: assets.chunks.core.entry,
          customPanelJS: assets.chunks["custom-panel"].entry,
          hassIconsJS: assets.chunks["hass-icons"].entry,
        }),
        filename: `index.html`,
      }),
      generateJSPage("onboarding", latestBuild),
      generateJSPage("authorize", latestBuild),
    ].filter(Boolean),
    output: {
      filename: ({ chunk }) => {
        const dontHash = new Set([
          // This is loaded from service-worker-bootstrap.js
          // which is processed by Workbox, not Webpack
          "service-worker-hass",
        ]);
        if (!isProdBuild || dontHash.has(chunk.name)) return `${chunk.name}.js`;
        return `${chunk.name}-${chunk.hash.substr(0, 8)}.js`;
      },
      chunkFilename:
        isProdBuild && !isStatsBuild
          ? "[chunkhash].chunk.js"
          : "[name].chunk.js",
      path: path.resolve(__dirname, buildPath),
      publicPath,
    },
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
  };
}

const isProdBuild = process.env.NODE_ENV === "production";
const configs = [createConfig(isProdBuild, /* latestBuild */ true)];
if (isProdBuild && !isStatsBuild) {
  configs.push(createConfig(isProdBuild, /* latestBuild */ false));
}
module.exports = configs;
