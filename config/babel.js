module.exports.babelLoaderConfig = ({ latestBuild }) => {
  if (latestBuild === undefined) {
    throw Error("latestBuild not defined for babel loader config");
  }
  return {
    test: /\.m?js$|\.ts$/,
    use: {
      loader: "babel-loader",
      options: {
        presets: [
          !latestBuild && [
            require("@babel/preset-env").default,
            { modules: false },
          ],
          require("@babel/preset-typescript").default,
        ].filter(Boolean),
        plugins: [
          // Part of ES2018. Converts {...a, b: 2} to Object.assign({}, a, {b: 2})
          [
            "@babel/plugin-proposal-object-rest-spread",
            { loose: true, useBuiltIns: true },
          ],
          // Used for decorators in typescript
          ["@babel/plugin-proposal-decorators", { legacy: true }],
          "@babel/plugin-proposal-class-properties",
          // Only support the syntax, Webpack will handle it.
          "@babel/syntax-dynamic-import",
          [
            "@babel/transform-react-jsx",
            {
              pragma: "h",
            },
          ],
        ],
      },
    },
  };
};
