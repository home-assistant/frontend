const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    index: './src/home-assistant.js',
  },
  plugins: [],
  output: {
    filename: '[name].bundle.js',
    chunkFilename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist/webpack')
  }
};
