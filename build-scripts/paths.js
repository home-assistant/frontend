var path = require("path");

module.exports = {
  polymer_dir: path.resolve(__dirname, ".."),
  build_dir: path.resolve(__dirname, "../build"),
  root: path.resolve(__dirname, "../hass_frontend"),
  static: path.resolve(__dirname, "../hass_frontend/static"),
  output: path.resolve(__dirname, "../hass_frontend/frontend_latest"),
  output_es5: path.resolve(__dirname, "../hass_frontend/frontend_es5"),
};
