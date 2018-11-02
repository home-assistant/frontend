const path = require("path");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const { babelLoaderConfig } = require("../config/babel.js");

const isProd = process.env.NODE_ENV === "production";
const chunkFilename = isProd ? "chunk.[chunkhash].js" : "[name].chunk";
const buildPath = path.resolve(__dirname, "dist");
const publicPath = isProd ? "./" : "http://localhost:8080/";

module.exports = {
  mode: isProd ? "production" : "development",
  // Disabled in prod while we make Home Assistant able to serve the right files.
  // Was source-map
  devtool: isProd ? "none" : "inline-source-map",
  entry: "./src/entrypoint.js",
  module: {
    rules: [
      babelLoaderConfig({ latestBuild: true }),
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
    new CopyWebpackPlugin([
      "public",
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
  ].filter(Boolean),
  resolve: {
    extensions: [".ts", ".js", ".json"],
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
