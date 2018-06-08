const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const CompressionPlugin = require("compression-webpack-plugin");
const config = require('./config.js');

const version = fs.readFileSync('../setup.py', 'utf8').match(/\d{8}[^']*/);
if (!version) {
  throw Error('Version not found');
}
const VERSION = version[0];
const isProdBuild = process.env.NODE_ENV === 'production'
const chunkFilename = isProdBuild ?
  'chunk.[chunkhash].js' : '[name].chunk.js';

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
  plugins.push(new CompressionPlugin({
    cache: true,
    exclude: [
      /\.js\.map$/,
      /\.LICENSE$/,
      /\.py$/,
      /\.txt$/,
    ]
  }));
}

module.exports = {
  mode: isProdBuild ? 'production' : 'development',
  // Disabled in prod while we make Home Assistant able to serve the right files.
  // Was source-map
  devtool: isProdBuild ? 'none' : 'inline-source-map',
  entry: {
    entrypoint: './src/entrypoint.js',
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
      },
      {
        test: /\.(html)$/,
        use: {
          loader: 'html-loader',
          options: {
            exportAsEs6Default: true,
          }
        }
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
