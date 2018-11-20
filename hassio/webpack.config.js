const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");
const config = require("./config.js");
const { babelLoaderConfig } = require("../config/babel.js");

const isProdBuild = process.env.NODE_ENV === "production";
const isCI = process.env.CI === "true";
const chunkFilename = isProdBuild ? "chunk.[chunkhash].js" : "[name].chunk.js";

module.exports = {
  mode: isProdBuild ? "production" : "development",
  devtool: isProdBuild ? "source-map" : "inline-source-map",
  entry: {
    entrypoint: "./src/entrypoint.js",
  },
  module: {
    rules: [
      babelLoaderConfig({ latestBuild: false }),
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
    isProdBuild &&
      new UglifyJsPlugin({
        extractComments: true,
        sourceMap: true,
        uglifyOptions: {
          // Disabling because it broke output
          mangle: false,
        },
      }),
    isProdBuild &&
      !isCI &&
      new CompressionPlugin({
        cache: true,
        exclude: [/\.js\.map$/, /\.LICENSE$/, /\.py$/, /\.txt$/],
      }),
  ].filter(Boolean),
  resolve: {
    extensions: [".ts", ".js", ".json"],
  },
  output: {
    filename: "[name].js",
    chunkFilename,
    path: config.buildDir,
    publicPath: `${config.publicPath}/`,
  },
};
