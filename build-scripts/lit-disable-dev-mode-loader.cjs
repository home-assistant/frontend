/* global module */

module.exports = function litDisableDevModeLoader(source) {
  return source.replace(
    /\b(const|let|var) DEV_MODE = true;/g,
    "$1 DEV_MODE = false;"
  );
};
