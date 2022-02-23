/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const env = require("./env.js");
const paths = require("./paths.js");

// Files from NPM Packages that should not be imported
module.exports.ignorePackages = ({ latestBuild }) => [
  // Part of yaml.js and only used for !!js functions that we don't use
  require.resolve("esprima"),
];

// Files from NPM packages that we should replace with empty file
module.exports.emptyPackages = ({ latestBuild, isHassioBuild }) =>
  [
    // Contains all color definitions for all material color sets.
    // We don't use it
    require.resolve("@polymer/paper-styles/color.js"),
    require.resolve("@polymer/paper-styles/default-theme.js"),
    // Loads stuff from a CDN
    require.resolve("@polymer/font-roboto/roboto.js"),
    require.resolve("@vaadin/vaadin-material-styles/typography.js"),
    require.resolve("@vaadin/vaadin-material-styles/font-icons.js"),
    // Compatibility not needed for latest builds
    latestBuild &&
      // wrapped in require.resolve so it blows up if file no longer exists
      require.resolve(
        path.resolve(paths.polymer_dir, "src/resources/compatibility.ts")
      ),
    // This polyfill is loaded in workers to support ES5, filter it out.
    latestBuild && require.resolve("proxy-polyfill/src/index.js"),
    // Icons in supervisor conflict with icons in HA so we don't load.
    isHassioBuild &&
      require.resolve(
        path.resolve(paths.polymer_dir, "src/components/ha-icon.ts")
      ),
    isHassioBuild &&
      require.resolve(
        path.resolve(paths.polymer_dir, "src/components/ha-icon-picker.ts")
      ),
  ].filter(Boolean);

module.exports.definedVars = ({ isProdBuild, latestBuild, defineOverlay }) => ({
  __DEV__: !isProdBuild,
  __BUILD__: JSON.stringify(latestBuild ? "latest" : "es5"),
  __VERSION__: JSON.stringify(env.version()),
  __DEMO__: false,
  __SUPERVISOR__: false,
  __BACKWARDS_COMPAT__: false,
  __STATIC_PATH__: "/static/",
  "process.env.NODE_ENV": JSON.stringify(
    isProdBuild ? "production" : "development"
  ),
  ...defineOverlay,
});

module.exports.terserOptions = (latestBuild) => ({
  safari10: !latestBuild,
  ecma: latestBuild ? undefined : 5,
  output: { comments: false },
});

module.exports.babelOptions = ({ latestBuild }) => ({
  babelrc: false,
  compact: false,
  presets: [
    !latestBuild && [
      "@babel/preset-env",
      {
        useBuiltIns: "entry",
        corejs: "3.15",
        bugfixes: true,
      },
    ],
    "@babel/preset-typescript",
  ].filter(Boolean),
  plugins: [
    [
      path.resolve(
        paths.polymer_dir,
        "build-scripts/babel-plugins/inline-constants-plugin.js"
      ),
      {
        modules: ["@mdi/js"],
        ignoreModuleNotFound: true,
      },
    ],
    // Part of ES2018. Converts {...a, b: 2} to Object.assign({}, a, {b: 2})
    !latestBuild && [
      "@babel/plugin-proposal-object-rest-spread",
      { loose: true, useBuiltIns: true },
    ],
    // Only support the syntax, Webpack will handle it.
    "@babel/plugin-syntax-import-meta",
    "@babel/plugin-syntax-dynamic-import",
    "@babel/plugin-syntax-top-level-await",
    "@babel/plugin-proposal-optional-chaining",
    "@babel/plugin-proposal-nullish-coalescing-operator",
    ["@babel/plugin-proposal-decorators", { decoratorsBeforeExport: true }],
    ["@babel/plugin-proposal-private-methods", { loose: true }],
    ["@babel/plugin-proposal-private-property-in-object", { loose: true }],
    ["@babel/plugin-proposal-class-properties", { loose: true }],
  ].filter(Boolean),
  exclude: [
    // \\ for Windows, / for Mac OS and Linux
    /node_modules[\\/]core-js/,
    /node_modules[\\/]webpack[\\/]buildin/,
  ],
});

const outputPath = (outputRoot, latestBuild) =>
  path.resolve(outputRoot, latestBuild ? "frontend_latest" : "frontend_es5");

const publicPath = (latestBuild, root = "") =>
  latestBuild ? `${root}/frontend_latest/` : `${root}/frontend_es5/`;

/*
BundleConfig {
  // Object with entrypoints that need to be bundled
  entry: { [name: string]: pathToFile },
  // Folder where bundled files need to be written
  outputPath: string,
  // absolute url-path where bundled files can be found
  publicPath: string,
  // extra definitions that we need to replace in source
  defineOverlay: {[name: string]: value },
  // if this is a production build
  isProdBuild: boolean,
  // If we're targeting latest browsers
  latestBuild: boolean,
  // If we're doing a stats build (create nice chunk names)
  isStatsBuild: boolean,
  // Names of entrypoints that should not be hashed
  dontHash: Set<string>
}
*/

module.exports.config = {
  app({ isProdBuild, latestBuild, isStatsBuild, isWDS }) {
    return {
      entry: {
        service_worker: "./src/entrypoints/service_worker.ts",
        app: "./src/entrypoints/app.ts",
        authorize: "./src/entrypoints/authorize.ts",
        onboarding: "./src/entrypoints/onboarding.ts",
        core: "./src/entrypoints/core.ts",
        "custom-panel": "./src/entrypoints/custom-panel.ts",
      },
      outputPath: outputPath(paths.app_output_root, latestBuild),
      publicPath: publicPath(latestBuild),
      isProdBuild,
      latestBuild,
      isStatsBuild,
      isWDS,
    };
  },

  demo({ isProdBuild, latestBuild, isStatsBuild }) {
    return {
      entry: {
        main: path.resolve(paths.demo_dir, "src/entrypoint.ts"),
      },
      outputPath: outputPath(paths.demo_output_root, latestBuild),
      publicPath: publicPath(latestBuild),
      defineOverlay: {
        __VERSION__: JSON.stringify(`DEMO-${env.version()}`),
        __DEMO__: true,
      },
      isProdBuild,
      latestBuild,
      isStatsBuild,
    };
  },

  cast({ isProdBuild, latestBuild }) {
    const entry = {
      launcher: path.resolve(paths.cast_dir, "src/launcher/entrypoint.ts"),
      media: path.resolve(paths.cast_dir, "src/media/entrypoint.ts"),
    };

    if (latestBuild) {
      entry.receiver = path.resolve(
        paths.cast_dir,
        "src/receiver/entrypoint.ts"
      );
    }

    return {
      entry,
      outputPath: outputPath(paths.cast_output_root, latestBuild),
      publicPath: publicPath(latestBuild),
      isProdBuild,
      latestBuild,
      defineOverlay: {
        __BACKWARDS_COMPAT__: true,
      },
    };
  },

  hassio({ isProdBuild, latestBuild }) {
    return {
      entry: {
        entrypoint: path.resolve(paths.hassio_dir, "src/entrypoint.ts"),
      },
      outputPath: outputPath(paths.hassio_output_root, latestBuild),
      publicPath: publicPath(latestBuild, paths.hassio_publicPath),
      isProdBuild,
      latestBuild,
      isHassioBuild: true,
      defineOverlay: {
        __SUPERVISOR__: true,
      },
    };
  },

  gallery({ isProdBuild, latestBuild }) {
    return {
      entry: {
        entrypoint: path.resolve(paths.gallery_dir, "src/entrypoint.js"),
      },
      outputPath: outputPath(paths.gallery_output_root, latestBuild),
      publicPath: publicPath(latestBuild),
      isProdBuild,
      latestBuild,
      defineOverlay: {
        __DEMO__: true,
      },
    };
  },
};
