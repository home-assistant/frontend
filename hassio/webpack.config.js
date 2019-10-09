const webpack = require("webpack");
const CompressionPlugin = require("compression-webpack-plugin");
const zopfli = require("@gfx/zopfli");

const config = require("./config.js");
const webpackBase = require("../build-scripts/webpack.js");
const { babelLoaderConfig } = require("../build-scripts/babel.js");

const isProdBuild = process.env.NODE_ENV === "production";
const isCI = process.env.CI === "true";
const chunkFilename = isProdBuild ? "chunk.[chunkhash].js" : "[name].chunk.js";
const latestBuild = false;

module.exports = {
  mode: isProdBuild ? "production" : "development",
  devtool: isProdBuild ? "source-map" : "inline-source-map",
  entry: {
    entrypoint: "./src/entrypoint.js",
  },
  module: {
    rules: [
      babelLoaderConfig({ latestBuild }),
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
      __DEV__: JSON.stringify(!isProdBuild),
      __DEMO__: false,
      __BUILD__: JSON.stringify(latestBuild ? "latest" : "es5"),
      "process.env.NODE_ENV": JSON.stringify(
        isProdBuild ? "production" : "development"
      ),
    }),
    isProdBuild &&
      !isCI &&
      new CompressionPlugin({
        cache: true,
        exclude: [/\.js\.map$/, /\.LICENSE$/, /\.py$/, /\.txt$/],
        algorithm(input, compressionOptions, callback) {
          return zopfli.gzip(input, compressionOptions, callback);
        },
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
