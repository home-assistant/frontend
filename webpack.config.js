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

  const copyPluginOpts = [
    { from: 'gulp/service-worker.js.tmpl', to: 'service_worker.js' },
  ];

  const plugins = [
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(!isProdBuild),
      __BUILD__: JSON.stringify(latestBuild ? 'latest' : 'es5'),
      __VERSION__: JSON.stringify(VERSION),
    }),
    new CopyWebpackPlugin(copyPluginOpts),
    // Ignore moment.js locales
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    // Color.js is bloated, it contains all color definitions for all material color sets.
    new webpack.NormalModuleReplacementPlugin(
      /@polymer\/paper-styles\/color\.js$/,
      path.resolve(__dirname, 'src/util/empty.js')
    ),
    // Ignore roboto pointing at CDN. We use local font-roboto-local.
    new webpack.NormalModuleReplacementPlugin(
      /@polymer\/font-roboto\/roboto\.js$/,
      path.resolve(__dirname, 'src/util/empty.js')
    ),
  ];

  if (latestBuild) {
    copyPluginOpts.push({ from: 'build-translations/output', to: `translations` });
    copyPluginOpts.push({ from: 'node_modules/@polymer/font-roboto-local/fonts', to: 'fonts' });
    copyPluginOpts.push('node_modules/@webcomponents/webcomponentsjs/webcomponents-bundle.js')
    copyPluginOpts.push({ from: 'node_modules/leaflet/dist/leaflet.css', to: `images/leaflet/` });
    copyPluginOpts.push({ from: 'node_modules/leaflet/dist/images', to: `images/leaflet/` });
  } else {
    copyPluginOpts.push('node_modules/@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js');
    babelOptions.presets = [
      ['es2015', { modules: false }]
    ];
    entry.compatibility = './src/entrypoints/compatibility.js';
  }

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

  const chunkFilename = isProdBuild ?
    '[name]-[chunkhash].chunk.js' : '[name].chunk.js';

  return {
    mode: isProdBuild ? 'production' : 'development',
    devtool: isProdBuild ? 'source-map ' : 'inline-source-map',
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
