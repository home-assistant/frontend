const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const config = require('./config.js');

const version = fs.readFileSync('../setup.py', 'utf8').match(/\d{8}[^']*/);
if (!version) {
  throw Error('Version not found');
}
const VERSION = version[0];
const isProdBuild = process.env.NODE_ENV === 'production'
const chunkFilename = isProdBuild ?
  '[name]-[chunkhash].chunk.js' : '[name].chunk.js';

const plugins = [
  new webpack.DefinePlugin({
    __DEV__: JSON.stringify(!isProdBuild),
    __VERSION__: JSON.stringify(VERSION),
  })
];

if (isProdBuild) {
  plugins.push(new UglifyJsPlugin({
    extractComments: true,
    sourceMap: true,
    uglifyOptions: {
      // Disabling because it broke output
      mangle: false,
    }
  }));
}

module.exports = {
  mode: isProdBuild ? 'production' : 'development',
  devtool: isProdBuild ? 'source-map ' : 'inline-source-map',
  entry: {
    app: './src/hassio-app.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['es2015', { modules: false }]
            ],
            plugins: [
              // Only support the syntax, Webpack will handle it.
              "syntax-dynamic-import",
            ],
          },
        },
      }
    ]
  },
  plugins,
  output: {
    filename: '[name].js',
    chunkFilename: chunkFilename,
    path: config.buildDir,
    publicPath: `${config.publicPath}/`,
  }
};
