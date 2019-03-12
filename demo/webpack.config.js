const path = require("path");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const WorkboxPlugin = require("workbox-webpack-plugin");
const { babelLoaderConfig } = require("../config/babel.js");
const webpackBase = require("../config/webpack.js");

const isProd = process.env.NODE_ENV === "production";
const isStatsBuild = process.env.STATS === "1";
const chunkFilename =
  isProd && !isStatsBuild ? "chunk.[chunkhash].js" : "[name].chunk.js";
const buildPath = path.resolve(__dirname, "dist");
const publicPath = "/";

const latestBuild = false;

module.exports = {
  mode: isProd ? "production" : "development",
  devtool: isProd ? "cheap-source-map" : "inline-source-map",
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
  optimization: webpackBase.optimization(latestBuild),
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
    ...webpackBase.plugins,
    isProd &&
      new WorkboxPlugin.GenerateSW({
        swDest: "service_worker_es5.js",
        importWorkboxFrom: "local",
        include: [],
      }),
  ].filter(Boolean),
  resolve: webpackBase.resolve,
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
