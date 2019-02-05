const webpack = require("webpack");
const path = require("path");
const BabelMinifyPlugin = require("babel-minify-webpack-plugin");

module.exports.plugins = [
  // Ignore moment.js locales
  new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
  // Color.js is bloated, it contains all color definitions for all material color sets.
  new webpack.NormalModuleReplacementPlugin(
    /@polymer\/paper-styles\/color\.js$/,
    path.resolve(__dirname, "../src/util/empty.js")
  ),
  // Ignore roboto pointing at CDN. We use local font-roboto-local.
  new webpack.NormalModuleReplacementPlugin(
    /@polymer\/font-roboto\/roboto\.js$/,
    path.resolve(__dirname, "../src/util/empty.js")
  ),
];

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
