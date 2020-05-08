const options = ({ latestBuild }) => ({
  presets: [
    !latestBuild && [require("@babel/preset-env").default, { modules: false }],
    require("@babel/preset-typescript").default,
  ].filter(Boolean),
  plugins: [
    // Part of ES2018. Converts {...a, b: 2} to Object.assign({}, a, {b: 2})
    [
      "@babel/plugin-proposal-object-rest-spread",
      { loose: true, useBuiltIns: true },
    ],
    // Only support the syntax, Webpack will handle it.
    "@babel/syntax-dynamic-import",
    "@babel/plugin-proposal-optional-chaining",
    "@babel/plugin-proposal-nullish-coalescing-operator",
    [
      require("@babel/plugin-proposal-decorators").default,
      { decoratorsBeforeExport: true },
    ],
    [
      require("@babel/plugin-proposal-class-properties").default,
      { loose: true },
    ],
  ],
});

module.exports.options = options;
module.exports.babelLoaderConfig = ({ latestBuild }) => {
  if (latestBuild === undefined) {
    throw Error("latestBuild not defined for babel loader config");
  }
  return {
    test: /\.m?js$|\.tsx?$/,
    exclude: [require.resolve("@mdi/js/mdi.js"), require.resolve("hls.js")],
    use: {
      loader: "babel-loader",
      options: options({ latestBuild }),
    },
  };
};
