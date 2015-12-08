var webpack = require("webpack");

var definePlugin = new webpack.DefinePlugin({
  __DEV__: JSON.stringify(JSON.parse(process.env.BUILD_DEV || 'true')),
  __DEMO__: JSON.stringify(JSON.parse(process.env.BUILD_DEMO || 'false')),
});

module.exports = {
  entry: {
    _app_compiled: './src/home-assistant.js',
    service_worker: './src/service-worker/index.js',
  },
  output: {
    path: 'build',
    filename: '[name].js',
  },
  module: {
    loaders: [
      {
        loader: 'babel-loader',
        test: /.js$/,
        exclude: /node_modules\/(^home-assistant-js)/,
      },
    ],
  },
  plugins: [
    definePlugin,
    new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /no-other-locales-for-now/),
  ],
};
