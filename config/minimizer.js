const BabelMinifyPlugin = require("babel-minify-webpack-plugin");

module.exports.minimizer = [
  // Took options from Polymer build tool
  // https://github.com/Polymer/tools/blob/master/packages/build/src/js-transform.ts
  new BabelMinifyPlugin(
    {
      // Disable the minify-constant-folding plugin because it has a bug relating
      // to invalid substitution of constant values into export specifiers:
      // https://github.com/babel/minify/issues/820
      evaluate: false,

      // TODO(aomarks) Find out why we disabled this plugin.
      simplifyComparisons: false,

      // Prevent removal of things that babel thinks are unreachable, but sometimes
      // gets wrong: https://github.com/Polymer/tools/issues/724
      deadcode: false,

      // Disable the simplify plugin because it can eat some statements preceeding
      // loops. https://github.com/babel/minify/issues/824
      simplify: false,

      // This is breaking ES6 output. https://github.com/Polymer/tools/issues/261
      mangle: false,
    },
    {}
  ),
];
