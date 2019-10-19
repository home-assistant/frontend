const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const webpackBase = require("../build-scripts/webpack.js");
const { babelLoaderConfig } = require("../build-scripts/babel.js");

const isProd = process.env.NODE_ENV === "production";
const chunkFilename = isProd ? "chunk.[chunkhash].js" : "[name].chunk.js";
const buildPath = path.resolve(__dirname, "dist");
const publicPath = isProd ? "./" : "http://localhost:8080/";
const latestBuild = true;

module.exports = {
  mode: isProd ? "production" : "development",
  // Disabled in prod while we make Home Assistant able to serve the right files.
  // Was source-map
  devtool: isProd ? "none" : "inline-source-map",
  entry: "./src/entrypoint.js",
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
    new CopyWebpackPlugin([
      "public",
      { from: "../public", to: "static" },
      { from: "../build-translations/output", to: "static/translations" },
      {
        from: "../node_modules/leaflet/dist/leaflet.css",
        to: "static/images/leaflet/",
      },
      {
        from: "../node_modules/roboto-fontface/fonts/roboto/*.woff2",
        to: "static/fonts/roboto/",
      },
      {
        from: "../node_modules/leaflet/dist/images",
        to: "static/images/leaflet/",
      },
    ]),
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
