const { createGalleryConfig } = require("../build-scripts/webpack.js");
const { isProdBuild, isStatsBuild } = require("../build-scripts/env.js");

module.exports = createGalleryConfig({
  isProdBuild: isProdBuild(),
  isStatsBuild: isStatsBuild(),
  latestBuild: true,
});
