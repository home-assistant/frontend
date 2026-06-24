/* global module */

module.exports = function litDisableDevModeLoader(source) {
  return source.replace(/\bconst DEV_MODE = true;/g, "const DEV_MODE = false;");
};
