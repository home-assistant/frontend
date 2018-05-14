const path = require('path');

function createConfig(isProdBuild, latestBuild) {
  // if (isProdBuild) {}
  let buildPath = latestBuild ? 'build/webpack/' : 'build/webpack-es5/';

  let publicPath;
  if (isProdBuild) {
    publicPath = latestBuild ? '/frontend_latest/' : '/frontend_es5/';
  } else {
    publicPath = `/home-assistant-polymer/${buildPath}`;
  }

  const rules = [];
  if (!latestBuild) {
    rules.push({
      test: /\.js$/,
      // exclude: /(node_modules|bower_components)/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            ['es2015', { modules: false }]
          ],
          plugins: [
            // Only support the syntax, Webpack will handle it.
            "syntax-dynamic-import"
          ],
        }
      }
    });
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
      rules
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
