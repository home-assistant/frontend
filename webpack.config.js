const path = require('path');

function createConfig(isProdBuild, latestBuild) {
  let buildPath = latestBuild ? 'build/webpack/' : 'build-es5/webpack/';

  let publicPath;
  if (isProdBuild) {
    publicPath = latestBuild ? '/frontend_latest/' : '/frontend_es5/';
  } else {
    publicPath = `/home-assistant-polymer/${buildPath}`;
  }

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

  if (!latestBuild) {
    babelOptions.presets = [
      ['es2015', { modules: false }]
    ];
  }

  const chunkFilename = isProdBuild ?
    '[name]-[chunkhash].chunk.js' : '[name].chunk.js';

  return {
    mode: isProdBuild ? 'production' : 'development',
    entry: {
      app: './src/home-assistant.js',
      authorize: './src/auth/ha-authorize.js'
    },
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
