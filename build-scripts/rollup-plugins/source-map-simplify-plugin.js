const MagicString = require("magic-string");

/**
 * Modify all source maps to be at line level precision.
 */

module.exports = function () {
  return {
    name: "source-map-simplify",
    transform(code) {
      return {
        code,
        map: new MagicString(code).generateMap({ hires: false }),
      };
    },
  };
};
