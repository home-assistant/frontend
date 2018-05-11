const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    index: './src/home-assistant.js',
    authorize: './src/auth/ha-authorize.js'
  },
  plugins: [],
  output: {
    filename: '[name].bundle.js',
    chunkFilename: '[name].bundle.js',
    path: path.resolve(__dirname, 'build/webpack')
  }
};
