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
