const path = require("path");
const env = require("./env.cjs");
const paths = require("./paths.cjs");

// GitHub base URL to use for production source maps
// Nightly builds use the commit SHA, otherwise assumes there is a tag that matches the version
module.exports.sourceMapURL = () => {
  const ref = env.version().endsWith("dev")
    ? process.env.GITHUB_SHA || "dev"
    : env.version();
  return `https://raw.githubusercontent.com/home-assistant/frontend/${ref}/`;
};

// Files from NPM Packages that should not be imported
// eslint-disable-next-line unused-imports/no-unused-vars
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

module.exports.htmlMinifierOptions = {
  caseSensitive: true,
  collapseWhitespace: true,
  conservativeCollapse: true,
  decodeEntities: true,
  removeComments: true,
  removeRedundantAttributes: true,
  minifyCSS: {
    compatibility: "*,-properties.zeroUnits",
  },
};

module.exports.terserOptions = ({ latestBuild, isTestBuild }) => ({
  safari10: !latestBuild,
  ecma: latestBuild ? 2015 : 5,
  module: latestBuild,
  format: { comments: false },
  sourceMap: !isTestBuild,
});

module.exports.babelOptions = ({ latestBuild, isProdBuild, isTestBuild }) => ({
  babelrc: false,
  compact: false,
  assumptions: {
    privateFieldsAsProperties: true,
    setPublicClassFields: true,
    setSpreadProperties: true,
  },
  browserslistEnv: latestBuild ? "modern" : "legacy",
  // Must be unambiguous because some dependencies are CommonJS only
  sourceType: "unambiguous",
  presets: [
    [
      "@babel/preset-env",
      {
        useBuiltIns: latestBuild ? false : "entry",
        corejs: latestBuild ? false : { version: "3.33", proposals: true },
        bugfixes: true,
        shippedProposals: true,
      },
    ],
    "@babel/preset-typescript",
  ],
  plugins: [
    [
      path.resolve(
        paths.polymer_dir,
        "build-scripts/babel-plugins/inline-constants-plugin.cjs"
      ),
      {
        modules: ["@mdi/js"],
        ignoreModuleNotFound: true,
      },
    ],
    // Minify template literals for production
    isProdBuild && [
      "template-html-minifier",
      {
        modules: {
          lit: [
            "html",
            { name: "svg", encapsulation: "svg" },
            { name: "css", encapsulation: "style" },
          ],
          "@polymer/polymer/lib/utils/html-tag": ["html"],
        },
        strictCSS: true,
        htmlMinifier: module.exports.htmlMinifierOptions,
        failOnError: true, // we can turn this off in case of false positives
      },
    ],
    // Import helpers and regenerator from runtime package
    [
      "@babel/plugin-transform-runtime",
      { version: require("../package.json").dependencies["@babel/runtime"] },
    ],
    // Support  some proposals still in TC39 process
    ["@babel/plugin-proposal-decorators", { decoratorsBeforeExport: true }],
  ].filter(Boolean),
  exclude: [
    // \\ for Windows, / for Mac OS and Linux
    /node_modules[\\/]core-js/,
    /node_modules[\\/]webpack[\\/]buildin/,
  ],
  sourceMaps: !isTestBuild,
});

const nameSuffix = (latestBuild) => (latestBuild ? "-modern" : "-legacy");

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
    // If it's just a test build in CI, skip time on source map generation
    isTestBuild: boolean,
    // Names of entrypoints that should not be hashed
    dontHash: Set<string>
  }
  */

module.exports.config = {
  app({ isProdBuild, latestBuild, isStatsBuild, isTestBuild, isWDS }) {
    return {
      name: "frontend" + nameSuffix(latestBuild),
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
      isTestBuild,
      isWDS,
    };
  },

  demo({ isProdBuild, latestBuild, isStatsBuild }) {
    return {
      name: "demo" + nameSuffix(latestBuild),
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
      name: "cast" + nameSuffix(latestBuild),
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

  hassio({ isProdBuild, latestBuild, isStatsBuild, isTestBuild }) {
    return {
      name: "supervisor" + nameSuffix(latestBuild),
      entry: {
        entrypoint: path.resolve(paths.hassio_dir, "src/entrypoint.ts"),
      },
      outputPath: outputPath(paths.hassio_output_root, latestBuild),
      publicPath: publicPath(latestBuild, paths.hassio_publicPath),
      isProdBuild,
      latestBuild,
      isStatsBuild,
      isTestBuild,
      isHassioBuild: true,
      defineOverlay: {
        __SUPERVISOR__: true,
        __STATIC_PATH__: `"${paths.hassio_publicPath}/static/"`,
      },
    };
  },

  gallery({ isProdBuild, latestBuild }) {
    return {
      name: "gallery" + nameSuffix(latestBuild),
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
