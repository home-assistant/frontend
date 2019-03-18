const CompressionPlugin = require("compression-webpack-plugin");
const config = require("./config.js");
const { babelLoaderConfig } = require("../config/babel.js");
const webpackBase = require("../config/webpack.js");

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
      __DEV__: false,
      __BUILD__: JSON.stringify(latestBuild ? "latest" : "es5"),
      __VERSION__: JSON.stringify("HASSIO"),
      __DEMO__: false,
      __STATIC_PATH__: "/static/",
      "process.env.NODE_ENV": JSON.stringify(
        isProdBuild ? "production" : "development"
      ),
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
