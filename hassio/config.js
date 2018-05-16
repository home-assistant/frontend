const path = require('path');

module.exports = {
  // Target directory for the build.
  buildDir: path.resolve(__dirname, 'build-es5'),
  // Path where the Hass.io frontend will be publicly available.
  publicPath: '/api/hassio/app-es5'
}