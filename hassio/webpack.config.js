const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");
const config = require("./config.js");

const isProdBuild = process.env.NODE_ENV === "production";
const chunkFilename = isProdBuild ? "chunk.[chunkhash].js" : "[name].chunk.js";

module.exports = {
  mode: isProdBuild ? "production" : "development",
  devtool: isProdBuild ? "source-map" : "inline-source-map",
  entry: {
    entrypoint: "./src/entrypoint.js",
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [require("@babel/preset-env").default, { modules: false }],
            ],
            plugins: [
              // Only support the syntax, Webpack will handle it.
              "@babel/syntax-dynamic-import",
            ],
          },
        },
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
      new CompressionPlugin({
        cache: true,
        exclude: [/\.js\.map$/, /\.LICENSE$/, /\.py$/, /\.txt$/],
      }),
  ].filter(Boolean),
  output: {
    filename: "[name].js",
    chunkFilename,
    path: config.buildDir,
    publicPath: `${config.publicPath}/`,
  },
};
