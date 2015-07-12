'use strict';

var webpack = require("webpack");

var definePlugin = new webpack.DefinePlugin({
  __DEV__: JSON.stringify(JSON.parse(process.env.BUILD_DEV || 'true')),
  __DEMO__: JSON.stringify(JSON.parse(process.env.BUILD_DEMO || 'false')),
});

module.exports = {
  entry: "./src/home-assistant.js",
  output: {
      path: 'build',
      filename: "_app_compiled.js"
  },
  module: {
    loaders: [
      {
        loader: "babel-loader",
        test: /.js$/,
        exclude: /node_modules\/(^home-assistant-js)/
      }
    ]
  },
  plugins: [
    definePlugin,
    new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /no-other-locales-for-now/)
  ]
};
