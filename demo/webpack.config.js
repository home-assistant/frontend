const path = require("path");
const webpack = require("webpack");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const WorkboxPlugin = require("workbox-webpack-plugin");
const { babelLoaderConfig } = require("../config/babel.js");

const isProd = process.env.NODE_ENV === "production";
const chunkFilename = isProd ? "chunk.[chunkhash].js" : "[name].chunk.js";
const buildPath = path.resolve(__dirname, "dist");
const publicPath = "./";

const latestBuild = false;

module.exports = {
  mode: isProd ? "production" : "development",
  // Disabled in prod while we make Home Assistant able to serve the right files.
  // Was source-map
  devtool: isProd ? "none" : "inline-source-map",
  entry: {
    main: "./src/entrypoint.ts",
    compatibility: "../src/entrypoints/compatibility.js",
  },
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
  plugins: [
    new webpack.DefinePlugin({
      __DEV__: false,
      __BUILD__: JSON.stringify(latestBuild ? "latest" : "es5"),
      __VERSION__: JSON.stringify("DEMO"),
      __DEMO__: true,
      __STATIC_PATH__: "/static/",
      "process.env.NODE_ENV": JSON.stringify(
        isProd ? "production" : "development"
      ),
    }),
    new CopyWebpackPlugin([
      "public",
      "../node_modules/@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js",
      { from: "../public", to: "static" },
      { from: "../build-translations/output", to: "static/translations" },
      {
        from: "../node_modules/leaflet/dist/leaflet.css",
        to: "static/images/leaflet/",
      },
      {
        from: "../node_modules/@polymer/font-roboto-local/fonts",
        to: "static/fonts",
      },
      {
        from: "../node_modules/leaflet/dist/images",
        to: "static/images/leaflet/",
      },
    ]),
    isProd &&
      new UglifyJsPlugin({
        extractComments: true,
        sourceMap: true,
        uglifyOptions: {
          // Disabling because it broke output
          mangle: false,
        },
      }),
    // isProd &&
    new WorkboxPlugin.GenerateSW({
      swDest: "service_worker_es5.js",
      importWorkboxFrom: "local",
    }),
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
    filename: "[name].js",
    chunkFilename: chunkFilename,
    path: buildPath,
    publicPath,
  },
  devServer: {
    contentBase: "./public",
  },
};
