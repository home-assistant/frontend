var path = require('path');
var webpack = require('webpack');

var definePlugin = new webpack.DefinePlugin({
  __DEV__: JSON.stringify(JSON.parse(process.env.BUILD_DEV || 'true')),
  __DEMO__: JSON.stringify(JSON.parse(process.env.BUILD_DEMO || 'false')),
});

module.exports = {
  entry: {
    _ui_compiled: './src/home-assistant.js',
    _core_compiled: './src/app-core.js',
    _demo_data_compiled: './node_modules/home-assistant-js/demo_data/expose_window.js',
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
        include: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, 'node_modules/home-assistant-js/demo_data'),
          path.resolve(__dirname, 'node_modules/home-assistant-js/src'),
        ],
      },
    ],
  },
  plugins: [
    definePlugin,
    new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /no-other-locales-for-now/),
  ],
};
