const webpack = require("webpack");
const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

module.exports.resolve = {
  extensions: [".ts", ".js", ".json", ".tsx"],
  alias: {
    react: "preact-compat",
    "react-dom": "preact-compat",
    // Not necessary unless you consume a module using `createClass`
    "create-react-class": "preact-compat/lib/create-react-class",
    // Not necessary unless you consume a module requiring `react-dom-factories`
    "react-dom-factories": "preact-compat/lib/react-dom-factories",
  },
};

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

module.exports.optimization = (latestBuild) => ({
  minimizer: [
    new TerserPlugin({
      cache: true,
      parallel: true,
      extractComments: true,
      terserOptions: {
        ecma: latestBuild ? undefined : 5,
      },
    }),
  ],
});
