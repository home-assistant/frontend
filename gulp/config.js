var path = require("path");

module.exports = {
  polymer_dir: path.resolve(__dirname, ".."),
  build_dir: path.resolve(__dirname, "../build"),
  output: path.resolve(__dirname, "../hass_frontend"),
  output_es5: path.resolve(__dirname, "../hass_frontend_es5"),
};
