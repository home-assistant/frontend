var path = require("path");

module.exports = {
  polymer_dir: path.resolve(__dirname, ".."),

  build_dir: path.resolve(__dirname, "../build"),
  root: path.resolve(__dirname, "../hass_frontend"),
  static: path.resolve(__dirname, "../hass_frontend/static"),
  output: path.resolve(__dirname, "../hass_frontend/frontend_latest"),
  output_es5: path.resolve(__dirname, "../hass_frontend/frontend_es5"),

  demo_dir: path.resolve(__dirname, "../demo"),
  demo_root: path.resolve(__dirname, "../demo/dist"),
  demo_static: path.resolve(__dirname, "../demo/dist/static"),
  demo_output: path.resolve(__dirname, "../demo/dist/frontend_latest"),
  demo_output_es5: path.resolve(__dirname, "../demo/dist/frontend_es5"),
};
