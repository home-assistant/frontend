const path = require('path');
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const CompressionPlugin = require("compression-webpack-plugin");

const isProd = process.env.NODE_ENV === 'production'
const chunkFilename = isProd ?
  'chunk.[chunkhash].js' : '[name].chunk.js';
const buildPath = path.resolve(__dirname, 'dist');
const publicPath = isProd ? './' : 'http://localhost:8080/';

module.exports = {
  mode: isProd ? 'production' : 'development',
  // Disabled in prod while we make Home Assistant able to serve the right files.
  // Was source-map
  devtool: isProd ? 'none' : 'inline-source-map',
  entry: './src/entrypoint.js',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: [
              // Only support the syntax, Webpack will handle it.
              "syntax-dynamic-import",
              [
                'transform-react-jsx',
                {
                  pragma: 'h'
                }
              ],

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
      },
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(!isProd),
    }),
    isProd && new UglifyJsPlugin({
      extractComments: true,
      sourceMap: true,
      uglifyOptions: {
        // Disabling because it broke output
        mangle: false,
      }
    }),
    isProd && new CompressionPlugin({
      cache: true,
      exclude: [
        /\.js\.map$/,
        /\.LICENSE$/,
        /\.py$/,
        /\.txt$/,
      ]
    }),
  ].filter(Boolean),
  output: {
    filename: '[name].js',
    chunkFilename: chunkFilename,
    path: buildPath,
    publicPath,
  },
  devServer: {
    contentBase: './public',
  }
};
