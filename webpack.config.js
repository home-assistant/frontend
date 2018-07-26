const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');
const CompressionPlugin = require("compression-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const translationMetadata = require('./build-translations/translationMetadata.json');

const version = fs.readFileSync('setup.py', 'utf8').match(/\d{8}[^']*/);
if (!version) {
  throw Error('Version not found');
}
const VERSION = version[0];

const generateJSPage = (entrypoint, latestBuild) => {
  return new HtmlWebpackPlugin({
    inject: false,
    template: './src/html/extra_page.html.template',
    // Default templateParameterGenerator code
    // https://github.com/jantimon/html-webpack-plugin/blob/master/index.js#L719
    templateParameters: (compilation, assets, option) => ({
      latestBuild,
      tag: `ha-${entrypoint}`,
      compatibility: assets.chunks.compatibility.entry,
      entrypoint: assets.chunks[entrypoint].entry,
    }),
    filename: `${entrypoint}.html`,
  });
}

function createConfig(isProdBuild, latestBuild) {
  let buildPath = latestBuild ? 'hass_frontend/' : 'hass_frontend_es5/';
  const publicPath = latestBuild ? '/frontend_latest/' : '/frontend_es5/';

  const entry = {
    app: './src/entrypoints/app.js',
    authorize: './src/entrypoints/authorize.js',
    onboarding: './src/entrypoints/onboarding.js',
    core: './src/entrypoints/core.js',
    compatibility: './src/entrypoints/compatibility.js',
    'custom-panel': './src/entrypoints/custom-panel.js',
  };

  if (latestBuild) {
    entry['hass-icons'] = './src/entrypoints/hass-icons.js';
    entry['service-worker-hass'] = './src/entrypoints/service-worker-hass.js';
  }

  const chunkFilename = isProdBuild ?
    '[chunkhash].chunk.js' : '[name].chunk.js';

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
            options: {
              presets: [
                !latestBuild && [
                  require('babel-preset-env').default, { modules: false }
                ],
              ].filter(Boolean),
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
        }
      ]
    },
    plugins: [
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(!isProdBuild),
        __BUILD__: JSON.stringify(latestBuild ? 'latest' : 'es5'),
        __VERSION__: JSON.stringify(VERSION),
        __PUBLIC_PATH__: JSON.stringify(publicPath),
        'process.env.NODE_ENV': JSON.stringify(isProdBuild ? 'production' : 'development'),
      }),
      new CopyWebpackPlugin([
        // Leave here until Hass.io no longer references the ES5 build.
        'node_modules/@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js',
        latestBuild && { from: 'public', to: '.' },
        latestBuild && { from: 'build-translations/output', to: `translations` },
        latestBuild && { from: 'node_modules/@polymer/font-roboto-local/fonts', to: 'fonts' },
        latestBuild && 'node_modules/@webcomponents/webcomponentsjs/webcomponents-bundle.js',
        latestBuild && 'node_modules/@webcomponents/webcomponentsjs/webcomponents-bundle.js.map',
        latestBuild && { from: 'node_modules/react-big-calendar/lib/css/react-big-calendar.css', to: 'panels/calendar/' },
        latestBuild && { from: 'node_modules/leaflet/dist/leaflet.css', to: `images/leaflet/` },
        latestBuild && { from: 'node_modules/leaflet/dist/images', to: `images/leaflet/` },
        !latestBuild && 'public/__init__.py',
      ].filter(Boolean)),
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
      isProdBuild && new UglifyJsPlugin({
        extractComments: true,
        sourceMap: true,
        uglifyOptions: {
          // Disabling because it broke output
          mangle: false,
        }
      }),
      isProdBuild && new CompressionPlugin({
        cache: true,
        exclude: [
          /\.js\.map$/,
          /\.LICENSE$/,
          /\.py$/,
          /\.txt$/,
        ]
      }),
      new WorkboxPlugin.InjectManifest({
        swSrc: './src/entrypoints/service-worker-bootstrap.js',
        swDest: 'service_worker.js',
        importWorkboxFrom: 'local',
        include: [
          /core.js$/,
          /app.js$/,
          /custom-panel.js$/,
          /hass-icons.js$/,
          /\.chunk\.js$/,
        ],
        // Static assets get cached during runtime. But these we want to explicitly cache
        // Need to be done using templatedUrls because prefix is /static
        globDirectory: '.',
        globIgnores: [],
        modifyUrlPrefix: {
          'hass_frontend': '/static'
        },
        templatedUrls: {
          [`/static/translations/${translationMetadata['translations']['en']['fingerprints']['en']}`]: [
            'build-translations/output/en.json'
          ],
          '/static/icons/favicon-192x192.png': [
            'public/icons/favicon-192x192.png'
          ],
          '/static/fonts/roboto/Roboto-Light.ttf': [
            'node_modules/@polymer/font-roboto-local/fonts/roboto/Roboto-Light.ttf'
          ],
          '/static/fonts/roboto/Roboto-Medium.ttf': [
            'node_modules/@polymer/font-roboto-local/fonts/roboto/Roboto-Medium.ttf'
          ],
          '/static/fonts/roboto/Roboto-Regular.ttf': [
            'node_modules/@polymer/font-roboto-local/fonts/roboto/Roboto-Regular.ttf'
          ],
          '/static/fonts/roboto/Roboto-Bold.ttf': [
            'node_modules/@polymer/font-roboto-local/fonts/roboto/Roboto-Bold.ttf'
          ],
        }
      }),
      new HtmlWebpackPlugin({
        inject: false,
        template: './src/html/index.html.template',
        // Default templateParameterGenerator code
        // https://github.com/jantimon/html-webpack-plugin/blob/master/index.js#L719
        templateParameters: (compilation, assets, option) => ({
          latestBuild,
          compatibility: assets.chunks.compatibility.entry,
          appjs: assets.chunks.app.entry,
          corejs: assets.chunks.core.entry,
        }),
        filename: `index.html`,
      }),
      generateJSPage('onboarding', latestBuild),
      generateJSPage('authorize', latestBuild),
    ].filter(Boolean),
    output: {
      filename: ({ chunk }) => {
        const dontHash = new Set([
          // Because we don't include it in ES5 build
          // And so can't reference it there
          'hass-icons',
          // This is loaded from service-worker-bootstrap.js
          // which is processed by Workbox, not Webpack
          'service-worker-hass',
        ]);
        if (!isProdBuild || dontHash.has(chunk.name)) return `${chunk.name}.js`;
        return `${chunk.name}-${chunk.hash.substr(0, 8)}.js`;
      },
      chunkFilename: chunkFilename,
      path: path.resolve(__dirname, buildPath),
      publicPath,
    },
    resolve: {
      alias: {
        'react': 'preact-compat',
        'react-dom': 'preact-compat',
        // Not necessary unless you consume a module using `createClass`
        'create-react-class': 'preact-compat/lib/create-react-class',
        // Not necessary unless you consume a module requiring `react-dom-factories`
        'react-dom-factories': 'preact-compat/lib/react-dom-factories'
      }
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
