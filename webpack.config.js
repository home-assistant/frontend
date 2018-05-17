const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const version = fs.readFileSync('setup.py', 'utf8').match(/\d{8}[^']*/);
if (!version) {
  throw Error('Version not found');
}
const VERSION = version[0];

function createConfig(isProdBuild, latestBuild) {
  let buildPath = latestBuild ? 'hass_frontend/' : 'hass_frontend_es5/';
  const publicPath = latestBuild ? '/frontend_latest/' : '/frontend_es5/';

  const entry = {
    app: './src/entrypoints/app.js',
    authorize: './src/entrypoints/authorize.js',
    core: './src/entrypoints/core.js',
  };

  const babelOptions = {
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
  };

  const plugins = [
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(!isProdBuild),
      __BUILD__: JSON.stringify(latestBuild ? 'latest' : 'es5'),
      __VERSION__: JSON.stringify(VERSION),
    })
  ];

  if (latestBuild) {
    plugins.push(CopyWebpackPlugin([
      { from: 'build-translations/output', to: `translations` },
      { from: 'node_modules/@polymer/font-roboto-local/fonts', to: 'fonts' },
      'node_modules/@webcomponents/webcomponentsjs/webcomponents-bundle.js',
      { from: 'node_modules/leaflet/dist/leaflet.css', to: `images/leaflet/` },
      { from: 'node_modules/leaflet/dist/images', to: `images/leaflet/` },
      { from: 'gulp/service-worker.js.tmpl', to: 'service_worker.js' },
    ]));
  } else {
    plugins.push(CopyWebpackPlugin([
      'node_modules/@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js',
    ]));
    babelOptions.presets = [
      ['es2015', { modules: false }]
    ];
    entry.compatibility = './src/entrypoints/compatibility.js';
  }

  if (isProdBuild) {
    plugins.push(new UglifyJsPlugin({
      parallel: true,
      extractComments: true,
      sourceMap: true,
    }));
  }

  const chunkFilename = isProdBuild ?
    '[name]-[chunkhash].chunk.js' : '[name].chunk.js';

  return {
    mode: isProdBuild ? 'production' : 'development',
    devtool: isProdBuild ? 'source-map ' : 'inline-cheap-source-map',
    entry,
    module: {
      rules: [
        {
          test: /\.js$/,
          use: {
            loader: 'babel-loader',
            options: babelOptions,
          },
        }
      ]
    },
    plugins,
    output: {
      filename: '[name].js',
      chunkFilename: chunkFilename,
      path: path.resolve(__dirname, buildPath),
      publicPath,
    }
  }
}

const isProdBuild = process.env.NODE_ENV === 'production'
const configs = [
  createConfig(isProdBuild, /* latestBuild */ true),
];
if (isProdBuild) {
  configs.push(createConfig(isProdBuild, /* latestBuild */ false));
}
module.exports = configs;
