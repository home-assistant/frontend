// Browser-only replacement for core-js/internals/get-built-in-node-module.
// The original helper evaluates `Function('return require("...")')()`
// when it detects a Node environment, which causes a runtime
// ReferenceError on browsers (notably Safari 14) if environment
// detection mis-classifies the page. Since browser bundles never need to
// access Node built-in modules, return undefined unconditionally.
//
// Wired up via rspack `NormalModuleReplacementPlugin` in build-scripts/rspack.cjs.
module.exports = function () {
  return undefined;
};
