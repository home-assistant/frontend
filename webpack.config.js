const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const version = fs.readFileSync('setup.py', 'utf8').match(/\d{8}[^']*/);
if (!version) {
  throw Error('Version not found');
}
const VERSION = version[0];

function createConfig(isProdBuild, latestBuild) {
  let buildPath = latestBuild ? 'hass_frontend/' : 'hass_frontend_es5/';

  let publicPath;
  if (isProdBuild) {
    publicPath = latestBuild ? '/frontend_latest/' : '/frontend_es5/';
  } else {
    publicPath = `/home-assistant-polymer/${buildPath}`;
  }

  const entry = {
    app: './src/home-assistant.js',
    authorize: './src/auth/ha-authorize.js',
    core: './js/core.js',
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
    ]));
  } else {
    plugins.push(CopyWebpackPlugin([
      'node_modules/@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js',
    ]));
    babelOptions.presets = [
      ['es2015', { modules: false }]
    ];
    entry.compatibility = './js/compatibility.js';
  }

  const chunkFilename = isProdBuild ?
    '[name]-[chunkhash].chunk.js' : '[name].chunk.js';

  return {
    mode: isProdBuild ? 'production' : 'development',
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
